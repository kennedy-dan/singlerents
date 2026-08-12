import { NextResponse } from 'next/server'; export const unauthorized=()=>NextResponse.json({error:'Unauthorized'},{status:401}); export const bad=(error)=>NextResponse.json({error},{status:400});
