import { AxiosError } from "axios";
import { requestFactory, requestDefaultConfig, RequestConfig } from "./request.base";
import { jwtDecode } from "jwt-decode";

const ACCESS_TOKEN = "access_token"
const REFRESH_TOKEN = "refresh_token"
const RETOKEN_URL = "/refresh_token"

// 是否正在刷新的标记
let isRefreshing = false;
// 重试队列，每一项将是一个待执行的函数形式
type AxiosRequest = (token: string) => void
let requests: AxiosRequest[] = [];


//存储Token到本地
function saveToken(accessToken: string, refreshToken: string) {
    window.localStorage.setItem(ACCESS_TOKEN, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN, refreshToken);
    //同时将AcccessToken存储到Cookies
    // let expires = new Date();
    // expires.setTime(expires.getTime() + 1 * 24 * 60 * 60 * 1000);
    // document.cookie =
    //     'dtmall_client_access_token=' +
    //     escape(accessToken) +
    //     ';expires=' +
    //     expires +
    //     ';path=/';
}


type NoRefreshTokenHandle = () => void

//刷新Token请求方法
// 返回值将是响应拦截器的返回值
async function refreshToken(error: AxiosError) {
    let refreshToken = window.localStorage.getItem(REFRESH_TOKEN);
    if (!refreshToken) {
        //    没有刷新token，去登录页登陆
        window.location.href = '/login'
        // 根据业务需求具体处理
        return Promise.resolve(error)
    }

    const config = error.response!.config;
    if (!isRefreshing) {
        isRefreshing = true;
        let isRefreshed = false;
        return instance
            .get(RETOKEN_URL, {
                params: {
                    refreshToken
                }
            })
            .then((res) => {
                //存储Token
                saveToken(res.data[ACCESS_TOKEN], res.data[REFRESH_TOKEN]);
                //已经刷新了token，将所有队列中的请求进行重试
                requests.forEach((cb) => cb(res.data[ACCESS_TOKEN]));
                //重试完了清空这个队列
                requests = [];
                isRefreshed = true;


                //为当前请求设置请求头
                config.headers.Authorization = 'Bearer ' + res.data[ACCESS_TOKEN];
                return instance(config);
            })
            .catch((err) => {
                //无法刷新Token时重新登录
                if (!isRefreshed) {
                    window.localStorage.removeItem(ACCESS_TOKEN);
                    window.localStorage.removeItem(REFRESH_TOKEN);
                    window.location.href = '/login';
                }
                return Promise.reject(err);
            })
            .finally(() => {
                isRefreshing = false;
            });
    } else {
        //正在刷新token，返回一个未执行resolve的promise
        return new Promise((resolve) => {
            //将resolve放进队列，用一个函数形式来保存，等token刷新后直接执行
            requests.push((token) => {
                config.headers.Authorization = 'Bearer ' + token;
                resolve(instance(config));
            });
        });
    }
}


// 请求错误处理函数
const errorHandle: RequestConfig['error'] = (res) => {
    const { status } = res
    // 根据具体业务写代码
    if (status === 401) {
        // 没有权限

    }    //422:数据验证未通过
    else if (status === 422) {

    } else if (status === 403) {
        //403暂不处理
    } else if (status === 404) {
        //404暂不处理


    }
}



const requestConfig = Object.freeze(Object.assign({
    error: errorHandle
}, requestDefaultConfig))
//axios实例
const { axiosInstance: instance, requestHandle } = requestFactory(requestConfig);

//添加请求拦截器
const requestInterceptor = instance.interceptors.request.use(
    (config) => {
        //获取token
        const token = window.localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            //判断是否存在token，如果存在的话，则每个http header都加上token
            config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
    },
    (error) => {
        // 请求时的错误
        return Promise.reject(error);
    }
);

//添加响应拦截器
const responseInterceptor = instance.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        if (!error.response) {
            // 没有收到响应

        }
        else if (error.response.status === 401) {
            // 没有权限，判断是不是token过期
            const token = window.localStorage.getItem(ACCESS_TOKEN)
            if (token) {
                const decodeToken = jwtDecode(token)
                if (decodeToken.exp! * 1000 <= Date.now()) {
                    // token已过期,刷新token
                    return refreshToken(error);
                }
            }
        }
        return Promise.reject(error);
    }
);


export type { AxiosRequest, NoRefreshTokenHandle }
export {
    instance as request,
    requestHandle,
    requestInterceptor,
    responseInterceptor,
    saveToken
}

