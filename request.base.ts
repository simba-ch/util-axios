import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, CreateAxiosDefaults, Method } from 'axios';
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
    url: string,
    beforeSend?: () => Promise<void>,
    completeSend?: () => Promise<void>,
    method?: Method | 'file' | 'FILE' | 'download' | 'DOWNLOAD',
    data?: any
    // `onUploadProgress` 允许为上传处理进度事件
    // 浏览器专属
    onUploadProgress?: AxiosRequestConfig['onUploadProgress'],
    // `onDownloadProgress` 允许为下载处理进度事件
    // 浏览器专属
    onDownloadProgress?: AxiosRequestConfig['onDownloadProgress'],
} & RequestCallbackConfig & RequestErrorConfig;


const requestDefaultConfig: RequestConfig = Object.freeze({
    url: '/',
})

type RequestCallbackConfig = {
    success?: (res: AxiosResponse) => Promise<void>
}
const requestCallback = async (response: AxiosResponse, callbackConfig: RequestCallbackConfig) => {
    // 成功响应
    // 如果有成功回调，调用回调
    callbackConfig.success && callbackConfig.success(response);

}




type RequestErrorConfig = {
    next?: boolean,
    error?: (AxiosResponse) => void;
}
const requestErrorHandle = async (error: AxiosError, errConfig: RequestErrorConfig) => {
    const { error: errorHandle } = errConfig

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
        throw error
    }

}



const requestFactory = (
    requestConfig = requestDefaultConfig,
    axiosConfig = axiosDefaultConfig
) => {
    const axiosInstance = axios.create(axiosConfig);


    const requestHandle = async (config = requestConfig) => {
        const { url, beforeSend, completeSend, method, data, success, onUploadProgress, onDownloadProgress, error, next } = config
        const callbackConfig: RequestCallbackConfig = {
            success
        }
        const errorConfig: RequestErrorConfig = {
            error,
            next
        }
        beforeSend && beforeSend()

        if (!method || method === 'get') {
            if (data) {
                axiosInstance.get(url, {
                    params: data
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else {
                axiosInstance.get(url)
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            }
        } else {
            if (method.toLowerCase() === 'file') {
                axiosInstance.postForm(url, data, {
                    onUploadProgress,
                    onDownloadProgress
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else if (method.toLowerCase() === 'download') {
                axiosInstance.get(url, {
                    responseType: 'blob'
                })
                    .then((res) => requestCallback(res, callbackConfig))
                    .catch((err) => requestErrorHandle(err, errorConfig))
                    .finally(completeSend)
            } else {
                axiosInstance({
                    url,
                    method,
                    data
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