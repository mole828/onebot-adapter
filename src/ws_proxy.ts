import WebSocket from 'ws';

export type Midware = (data: WebSocket.Data) => WebSocket.Data;


export class WebSocketProxy {
    private ws_in: WebSocket 
    private ws_out: WebSocket 
    public midware: Midware = (d)=>d;
    constructor(ws_in: WebSocket, ws_out: WebSocket) {
        this.ws_in = ws_in;
        this.ws_out = ws_out;
        if(ws_out.readyState===WebSocket.OPEN){
            ws_in.onmessage = e => ws_out.send(this.midware(e.data));
        } else {
            const buffer: Array<WebSocket.Data> = [];
            ws_in.onmessage = e => buffer.push(this.midware(e.data));
            ws_out.onopen = ()=>{
                ws_in.onmessage = e => ws_out.send(this.midware(e.data));
                buffer.forEach(data=>ws_out.send(data));
            };
        }
    }
}