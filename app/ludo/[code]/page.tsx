import LudoClient from "@/components/ludo/LudoClient";
export default async function LudoRoomPage({params}:{params:Promise<{code:string}>}){const {code}=await params;return <LudoClient code={code.toUpperCase()}/>;}
