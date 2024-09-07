import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, CanceledError, CreateAxiosDefaults, isCancel, Method } from 'axios';
//WebApi接口地址
const BASEAPI = 'http://localhost:3000';


// axios默认配置
const axiosDefaultConfig: CreateAxiosDefaults = Object.freeze({
    baseURL: BASEAPI,
    timeout: 20000, //设置请求超时时间
    headers: {
        'content-type': 'application/json',
    },
})


type RequestConfig = {
    url: string, //请求网址
    beforeSend?: () => Promise<void>,//请求发送前的调用函数
    completeSend?: () => Promise<void>,//请求发送后的调用函数
    method?: Method | 'file' | 'FILE' | 'download' | 'DOWNLOAD',//请求方法
} & RequestCallbackConfig & RequestErrorConfig & AxiosRequestConfig;


const requestDefaultConfig: RequestConfig = Object.freeze({
    url: '/',
})

type RequestCallbackConfig = {
    success?: (res: AxiosResponse) => Promise<void> //请求成功的回调
}
const requestCallback = async (response: AxiosResponse, callbackConfig: RequestCallbackConfig) => {
    // 成功响应
    // 如果有成功回调，调用回调
    callbackConfig.success && callbackConfig.success(response);

}




type RequestErrorConfig = {
    next?: boolean, //请求是否需要继续处理，true将返回一个reject promise继续下一步处理
    error?: (res: AxiosResponse) => void; //请求失败的回调
    cancelHandle?: (err: CanceledError<unknown>) => void; //请求取消的回调
}
const requestErrorHandle = async (error: AxiosError, errConfig: RequestErrorConfig) => {
    const { error: errorHandle, cancelHandle } = errConfig
    if (isCancel(error)) {
        cancelHandle && cancelHandle(error)
        return
    }
    error = error as AxiosError // 为error添加类型
    if (error.response) {
        // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
        errorHandle && errorHandle(error.response)
    } else if (error.request) {
        // 请求已经成功发起，但没有收到响应
        // `error.request` 在浏览器中是 XMLHttpRequest 的实例，
        // 而在node.js中是 http.ClientRequest 的实例

        console.log(error.request);
    } else {
        // 发送请求时出了点问题
        console.log('Error', error.message);
    }

    // 干点什么
    console.log(error);


    if (errConfig.next) {
        // 如果next为true，表示需要进一步处理，抛出错误
        return Promise.reject(error)
    }

}



const requestFactory = (
    requestConfig = requestDefaultConfig,
    axiosConfig = axiosDefaultConfig
) => {
    const axiosInstance = axios.create(axiosConfig);


    const requestHandle = async (config = requestConfig) => {
        const { url, beforeSend, completeSend, method, data, success, error, next, cancelHandle, ...resetConfig } = config
        const callbackConfig: RequestCallbackConfig = {
            success
        }
        const errorConfig: RequestErrorConfig = {
            error,
            next,
            cancelHandle
        }

        beforeSend && beforeSend()

        if (!method || method.toLowerCase() === 'get') {
            if (data) {
                axiosInstance.get(url, {
                    params: data,
                    ...resetConfig
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else {
                axiosInstance.get(url, resetConfig)
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            }
        } else {
            if (method.toLowerCase() === 'file') {
                axiosInstance.postForm(url, data, resetConfig)
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else if (method.toLowerCase() === 'download') {
                axiosInstance.get(url, {
                    responseType: 'blob',
                    ...resetConfig
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else {
                axiosInstance({
                    url,
                    method,
                    data,
                    ...resetConfig
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            }
        }

    }


    return { axiosInstance, requestHandle }


}

export type { RequestConfig }

export {
    axiosDefaultConfig,
    requestDefaultConfig,
    requestFactory
}