/* ---------- network: a free public MQTT broker carries presence-style messages (no accounts) ----------
   every page keeps one retained message on <room>/p/<peer>; the broker clears it when that page drops */
const NetRoom = (() => {
  const LINES = [
    {name:'国内线路', url:'wss://broker-cn.emqx.io:8084/mqtt'},
    {name:'海外线路', url:'wss://broker.emqx.io:8084/mqtt'},
  ];
  const ROOT = 'yirochi-uno0/v1/';
  const rid = () => Math.random().toString(36).slice(2, 10);
  function open(code, asHost, root){
    return new Promise((resolve, reject) => {
      const peerId = rid();
      const base = (root || ROOT) + code + '/p/';
      const myTopic = base + peerId;
      const mine = {}, others = new Map(), subs = new Set(), statusSubs = new Set();
      let active = null, pending = [], closed = false, settled = false, pubTimer = null, lastPub = 0;
      const selfPeer = () => ({peer: peerId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({...mine}), updatedAt: Date.now()});
      let snap = Object.freeze([selfPeer()]);
      function emit(change){
        snap = Object.freeze([selfPeer(), ...[...others.values()].map(o => o.peer)]);
        const ch = {peers: snap, joined: change.joined || [], left: change.left || [], updated: change.updated || []};
        subs.forEach(fn => setTimeout(() => fn(ch), 0));
      }
      function handle(id, text){
        const prev = others.get(id);
        if (!text){ if (prev){ others.delete(id); emit({left: [prev.peer]}); } return; }
        if (prev && prev.text === text){ prev.heard = Date.now(); return; }
        let pr; try { pr = JSON.parse(text); } catch(e){ return; }
        if (!pr || typeof pr !== 'object' || Array.isArray(pr)) return;
        const peer = Object.freeze({peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze(pr), updatedAt: Date.now()});
        others.set(id, {peer, text, heard: Date.now()});
        emit(prev ? {updated: [peer]} : {joined: [peer]});
      }
      function publishNow(){
        clearTimeout(pubTimer); pubTimer = null; lastPub = Date.now();
        if (closed || !Object.keys(mine).length) return;
        const payload = JSON.stringify(mine);
        for (const c of (active ? [active] : pending)) if (c.client.connected) c.client.publish(myTopic, payload, {retain: true, qos: 0});
      }
      function schedule(){
        if (!pubTimer) pubTimer = setTimeout(publishNow, Math.max(0, 80 - (Date.now() - lastPub)));
      }
      function drop(c){
        try { if (c.client.connected) c.client.publish(myTopic, '', {retain: true, qos: 1}); c.client.end(false); } catch(e){}
      }
      function adopt(c){
        if (active) return;
        active = c;
        for (const o of pending) if (o !== c) drop(o);
        pending = [c];
        const buf = c.buf; c.buf = null;
        for (const [id, text] of buf) handle(id, text);
        publishNow();
      }
      const api = {
        lineName: () => active ? active.line.name : '',
        presence(patch){
          for (const [k, v] of Object.entries(patch || {})){ if (v === null) delete mine[k]; else mine[k] = v; }
          schedule();
          return Promise.resolve();
        },
        peers: () => snap,
        onPeers(fn){ subs.add(fn); setTimeout(() => fn({peers: snap, joined: snap, left: [], updated: []}), 0); return () => subs.delete(fn); },
        onStatus(fn){ statusSubs.add(fn); return () => statusSubs.delete(fn); },
        connected: () => !!(active && active.client.connected),
        leave(){
          if (closed) return Promise.resolve();
          closed = true; clearInterval(hb); clearTimeout(pubTimer);
          pending.forEach(drop); subs.clear(); statusSubs.clear();
          return Promise.resolve();
        },
      };
      function start(line){
        const client = mqtt.connect(line.url, {
          clientId: 'uno0_' + rid() + rid(), keepalive: 20, reconnectPeriod: 2500, connectTimeout: 8000, clean: true,
          will: {topic: myTopic, payload: '', retain: true, qos: 0},
        });
        const c = {client, line, buf: new Map()};
        pending.push(c);
        client.on('connect', () => {
          if (closed || (active && active !== c)){ drop(c); return; }
          client.subscribe(base + '+', {qos: 0});
          publishNow();                                  // (re)assert presence after every (re)connect
          if (active === c) statusSubs.forEach(f => f(true));
          if (!settled){
            settled = true;
            if (asHost) adopt(c);                        // the host stays on the first line that answers
            resolve(api);
          }
        });
        client.on('message', (topic, buf) => {
          if (closed) return;
          const id = topic.slice(base.length);
          if (!id || id === peerId) return;
          const text = buf && buf.length && buf.length < 16000 ? new TextDecoder().decode(buf) : '';
          if (!active){                                  // a guest keeps every line open until one has this room's host
            c.buf.set(id, text);
            if (!text) return;
            try { const pr = JSON.parse(text); if (pr && pr.role === 'host' && pr.t === code) adopt(c); } catch(e){}
            return;
          }
          if (c === active) handle(id, text);
        });
        client.on('offline', () => { if (active === c) statusSubs.forEach(f => f(false)); });
        client.on('error', () => {});
      }
      let lastBeat = Date.now();
      const hb = setInterval(() => {
        if (closed) return;
        publishNow();
        const now = Date.now(), slept = now - lastBeat > 25000;   // this page was frozen: its silence says nothing about the others
        lastBeat = now;
        for (const [id, o] of others){
          if (slept) o.heard = now;
          else if (now - o.heard > 75000){ others.delete(id); emit({left: [o.peer]}); }
        }
      }, 15000);
      if (asHost){
        start(LINES[0]);
        setTimeout(() => { if (!settled && !closed) start(LINES[1]); }, 6000);
      } else LINES.forEach(start);
      setTimeout(() => {
        if (settled) return;
        closed = true; clearInterval(hb);
        pending.forEach(c => { try { c.client.end(true); } catch(e){} });
        reject(new Error('no broker reachable'));
      }, 16000);
    });
  }
  return {open};
})();
