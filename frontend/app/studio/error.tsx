"use client";
export default function StudioError({reset}:{error:Error;reset:()=>void}) {
  return <main><h1>Assistant studio could not load</h1><button onClick={reset}>Try again</button></main>;
}
