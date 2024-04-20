import express from 'express';
import WebSocket from 'ws';
import {WebSocketProxy} from './ws_proxy';
import axios, { AxiosError } from 'axios';
import {URL} from "url";

type WsHandler = (ws: WebSocket, req: express.Request) => void;

declare module 'express-serve-static-core' {
  interface Application {
    ws: (route: string, handle: WsHandler) => Application;
  }
}

const app = express();
require('express-ws')(app);

app.use('/', express.static('public'))

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const axiosInstance = axios.create({
  maxRedirects: 5,
  // proxy: {
  //   host: '127.0.0.1',
  //   port: 7890,
  //   protocol: 'http',
  // }
})

app.get('/proxy/*', (req,res)=>{
  const proxyPath = (req.params as {[key: string]: string})[0];  // 获取/proxy/后面的路径
  const handers = req.headers;
  // const url = new URL(proxyPath);
  // handers.host = url.host;
  // handers['Proxy-Connection'] = 'keep-alive';
  // req.query['is_origin'] = '1';
  axiosInstance.get(proxyPath, {
    params: req.query, 
    headers: handers, 
    responseType: 'arraybuffer',
    timeout: 5000,
  })
  .then(forward_res=>{
    res.set(forward_res.headers);
    res.send(forward_res.data);
  })
  .catch(reason=>{
    const axios_error = reason as AxiosError;
    console.log({reason, express: req});
    if(axios_error.status){
      res.status(axios_error.status);
    } else {
      res.status(400);
    }
    res.end();
  });
});

const {FORWARD_URL} = process.env;

if(!FORWARD_URL){
  console.warn("FORWARD_URL not exist.");
}

const action2echo: Map<string,string> = new Map();
app.ws("/ws", (ws, request)=>{
  console.log('new connect')
  const forward = new WebSocket(FORWARD_URL as string, {});
  console.log('create proxy');
  const upload = new WebSocketProxy(ws, forward);
  const download = new WebSocketProxy(forward, ws);
  upload.midware = (data)=>{
    // console.log(data);
    const {action, echo}:{action:string, echo:string}=JSON.parse(data.toString());
    action2echo.set(action, echo); // 也许以后支持通过action修改事件，现在只用echo了
    return data;
  };
  download.midware = (ws_data)=>{
    const obj = JSON.parse(ws_data.toString());
    const {
      echo,
      post_type,
    }:{
      echo:string|undefined,
      post_type:string|undefined,
    }=obj;
    if(echo){
      // action类型的判断方式
      // console.log(echo);
      if(echo==='getChatHistoryFist'){
        const {
          data: {messages}
        }:{
          retcode: number
          echo: string
          status: string
          data: { messages: Array<{message:Array<MessageChain>}>}
        } = obj;
        messages.forEach(_message=>{
          // 一条消息
          const {message} = _message;
          message.forEach(_msg=>{
            // 消息链的小节 Text -> Image -> Text ...
            const {type, data}:MessageChain = _msg;
            if(type==='image') {
              const image_data = data as MessageChain_Image;
              const {url} = image_data;
              const proxy_url = `${request.protocol}://${request.get('host')}/proxy/${url}`;
              image_data.url = proxy_url;
              image_data.file = proxy_url;
              _msg.data = image_data;
            }
          })
        })
      }
    } else if (post_type){
      // post类型的判断方式
      // console.log(post_type);
      if(post_type==='message'){
        const {message}:{message:Array<MessageChain>} = obj;
        message.forEach(_msg => {
          const {type, data} = _msg;
          if(type==='image') {
            const image_data = data as MessageChain_Image;
            const {url} = image_data;
            const proxy_url = `${request.protocol}://${request.get('host')}/proxy/${url}`;
            image_data.url = proxy_url;
            image_data.file = proxy_url;
            _msg.data = image_data;
          }
        });
      }
    }

    return JSON.stringify(obj);
  };
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
