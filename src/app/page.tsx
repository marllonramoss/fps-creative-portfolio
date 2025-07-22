"use client";
import Image from "next/image";
import dynamic from "next/dynamic";

const FullScene = dynamic(() => import("./FullScene"), { ssr: false });

export default function Home() {
  return (
    <FullScene />
  );
}
