import MicrogameRoom from "@/components/microgame/MicrogameRoom";
export default async function MicrogameRoomPage({params}:{params:Promise<{code:string}>}){const{code}=await params;return <MicrogameRoom code={code.toUpperCase()}/>;}
