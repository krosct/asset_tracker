"use client"
import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(""); // Limpa mensagens anteriores

    try {
        const response = await api.post("/auth/forgot-password", { email });
        setMessage(response.data.message || "E-mail de recuperação enviado.");
    } catch (err: any) {
        // Pega a mensagem de erro vinda do backend
        const errorMsg = err.response?.data?.error || "Erro ao solicitar recuperação.";
        setMessage(errorMsg);
        console.error("Erro detalhado:", err.response?.data);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Recuperar Senha</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleRequest} className="space-y-4">
            {message && <p className="text-sm text-emerald-500">{message}</p>}
            <Input 
              type="email" 
              placeholder="Seu e-mail" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
            <Button type="submit" className="w-full">Enviar Link</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}