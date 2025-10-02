"use client"

import Chat from "./chat/page"
import TextType from "@/components/TextType"
import LightRays from "@/components/LightRays"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  return (
    <main className="flex min-h-screen bg-background bg-black items-center justify-center">
      <div className="absolute inset-0">
          <LightRays
            raysOrigin="top-center"
            raysColor="#00ffff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
            className="custom-rays"
          />
      </div>
      <div className="relative z-10 text-center flex flex-col items-center gap-6">
        <TextType className="text-2xl font-bold text-white" 
          text={[
            "Hey, I was waiting for you...",
            "Got a question? I’ve got the answers.",
            "Lost in docs? I’ll guide you out.",
            "Wanna search smarter, not harder?",
            "Need an anime-style image? Say the word.",
            "I’m not just AI... I’m your sidekick.",
            "Ready to explore together?"
          ]}
          typingSpeed={55}
          pauseDuration={1500}
          showCursor={true}
          cursorCharacter="|"
        />
        <Button variant="outline" onClick = {() => router.push("/login")}>Get Started</Button>
      </div>
    </main>
  );
}
