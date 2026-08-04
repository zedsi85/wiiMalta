import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { registerForPush } from "@/lib/push";
import { c, font, r } from "@/lib/theme";
import { BrandButton, Eyebrow, H1, Screen } from "@/components/ui";

export default function LoginScreen() {
  const { requestCode, verifyCode } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = {
    backgroundColor: c.charcoal,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: c.slate,
    color: c.bone,
    fontFamily: font.ui,
    fontSize: 16,
    padding: 14,
  } as const;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Eyebrow>Wii Event Malta</Eyebrow>
        <H1>Sign in</H1>
        <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.fog, marginTop: 8, marginBottom: 24 }}>
          Same account as the website. Email → 6-digit code. No passwords, ever.
        </Text>

        {stage === "email" ? (
          <View style={{ gap: 14 }}>
            <TextInput
              style={input}
              placeholder="you@domain.com"
              placeholderTextColor={c.ash}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
            />
            <BrandButton
              title="Email me a code"
              busy={busy}
              disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || busy}
              onPress={async () => {
                setBusy(true);
                setError(null);
                try {
                  await requestCode(email);
                  setStage("code");
                } catch {
                  setError("Couldn't send the code — check your connection.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.sand }}>Code sent to {email}.</Text>
            <TextInput
              style={[input, { textAlign: "center", fontFamily: font.monoBold, fontSize: 24, letterSpacing: 8 }]}
              placeholder="••••••"
              placeholderTextColor={c.ash}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
              accessibilityLabel="Sign-in code"
            />
            <BrandButton
              title="Sign in"
              busy={busy}
              disabled={code.length !== 6 || busy}
              onPress={async () => {
                setBusy(true);
                setError(null);
                const ok = await verifyCode(email, code);
                setBusy(false);
                if (!ok) {
                  setError("That code didn't match — check the digits or resend.");
                  return;
                }
                void registerForPush();
                router.back();
              }}
            />
            <Pressable onPress={() => { setStage("email"); setCode(""); setError(null); }}>
              <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog, textDecorationLine: "underline" }}>
                ← different email / resend
              </Text>
            </Pressable>
          </View>
        )}
        {error && <Text style={{ color: c.ember300, fontFamily: font.ui, fontSize: 13, marginTop: 12 }}>{error}</Text>}
      </SafeAreaView>
    </Screen>
  );
}
