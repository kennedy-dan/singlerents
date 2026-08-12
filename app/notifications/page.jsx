'use client';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
export default function Notifications(){const [items,setItems]=useState([]);useEffect(()=>{fetch('/api/notifications').then(r=>r.ok?r.json():null).then(v=>setItems(v?.notifications||[]));fetch('/api/notifications',{method:'PATCH'})},[]);return <><Header/><main className="page"><p className="eyebrow">ACTIVITY</p><h1>Notifications</h1><section className="panel">{items.map(n=><div className="listing" key={n.id}><div><b>{n.type.replace('_',' ')}</b><small>{n.body} · {new Date(n.createdAt).toLocaleString()}</small></div></div>)}{!items.length&&<p className="muted">You are all caught up.</p>}</section></main></>}
