import TasirClient from "@/components/tasir/TasirClient";
export default async function TasirRoomPage({params}:{params:Promise<{code:string}>}){const{code}=await params;return <TasirClient code={code.toUpperCase()}/>;}
