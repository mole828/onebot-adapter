import express from 'express';
import WebSocket from 'ws';
import {WebSocketProxy} from './ws_proxy';
import axios from 'axios';

type WsHandler = (ws: WebSocket, req: express.Request) => void;

declare module 'express-serve-static-core' {
  interface Application {
    ws: (route: string, handle: WsHandler) => Application;
  }
}

const app = express();
require('express-ws')(app);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/proxy/*', (req,res)=>{
  const proxyPath = (req.params as {[key: string]: string})[0];  // 获取/proxy/后面的路径
  axios.get(proxyPath, {params:req.query, responseType: 'arraybuffer'})
  .then(forward_res=>{
    res.set(forward_res.headers);
    res.send(forward_res.data);
  })
  .catch(reason=>console.log(reason));
});

const action2echo: Map<string,string> = new Map();
app.ws("/ws", (ws, request)=>{
  console.log('new connect')
  const forward = new WebSocket("ws://10.0.0.42:7780", {});
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
              const imageData = data as MessageChain_Image;
              const {url} = imageData;
              const proxy_url = `${request.protocol}://${request.get('host')}/proxy/${url}`;
              const encode_url = encodeURIComponent(proxy_url);
              imageData.url = proxy_url;
              imageData.file = proxy_url;
              _msg.data = imageData;
            }
          })
        })
      }
    } else if (post_type){
      // post类型的判断方式
    }

    return JSON.stringify(obj);
  };
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
