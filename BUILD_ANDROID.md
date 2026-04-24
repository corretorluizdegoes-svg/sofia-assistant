# Gerar Android App Bundle (.aab) — S.O.F.I.A.

O `.aab` **não pode ser gerado dentro do Lovable** (sem Android SDK / Gradle / Java no sandbox).
Siga esses passos na sua máquina (Windows, Mac ou Linux com Android Studio instalado).

## Pré-requisitos
- [Android Studio](https://developer.android.com/studio) instalado
- Node.js 18+
- Java JDK 17+ (vem com o Android Studio)

## 1. Pegar o código
No Lovable: botão **GitHub → Connect to GitHub** (ou **Export to GitHub**), depois:
```bash
git clone <seu-repo>
cd <seu-repo>
npm install
```

## 2. Build da web app (modo produção)
```bash
npm run build
```
Isso gera a pasta `dist/` que o Capacitor vai empacotar dentro do APK/AAB.

## 3. Adicionar a plataforma Android (só na primeira vez)
```bash
npx cap add android
npx cap sync android
```

## 4. Abrir no Android Studio
```bash
npx cap open android
```

## 5. Criar a keystore (só na primeira vez — GUARDE COM A VIDA)
No Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle → Next → Create new...**

Preencha:
- Key store path: `~/sofia-release.jks` (ou onde preferir)
- Password: (escolha uma forte e anote)
- Alias: `sofia`
- Validity: 25 anos
- Certificate: nome, organização, país etc.

⚠️ **Se você perder essa keystore, NUNCA mais conseguirá publicar updates do app na Play Store.** Faça backup em local seguro.

## 6. Gerar o .aab assinado
Ainda no diálogo **Generate Signed Bundle**:
1. Selecione a keystore criada acima
2. Build variant: **release**
3. Clique em **Create**

O arquivo final fica em:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Esse é o arquivo que você sobe na **Google Play Console**.

## 7. Atualizar o app depois de mudanças no Lovable
Sempre que mexer no código pelo Lovable:
```bash
git pull
npm install
npm run build
npx cap sync android
```
Depois é só repetir o passo 6 (gerar bundle assinado) no Android Studio com a **mesma keystore**.

## Versionamento (importante pra Play Store)
A cada novo upload, a Play Store exige `versionCode` maior. Edite:
```
android/app/build.gradle
```
e incremente:
```gradle
versionCode 2
versionName "1.0.1"
```

## Ícone e splash
Para gerar ícones automaticamente a partir de uma imagem:
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --android
```
Coloque um `icon.png` (1024x1024) e `splash.png` (2732x2732) na pasta `assets/` do projeto antes de rodar.
