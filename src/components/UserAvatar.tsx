import { Profile, corDeIniciais, iniciaisDe, nomeExibido } from "@/hooks/useProfile";

type Props = {
  profile: Profile | null;
  size?: number;
  className?: string;
  ring?: boolean;
};

/** Avatar circular: foto se houver, senão iniciais com fundo gerado. */
export function UserAvatar({ profile, size = 36, className = "", ring = false }: Props) {
  const iniciais = iniciaisDe(profile);
  const cor = corDeIniciais(profile?.codinome ?? profile?.display_name ?? "agente");
  const px = `${size}px`;

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={nomeExibido(profile)}
        width={size}
        height={size}
        style={{ width: px, height: px }}
        className={`rounded-full object-cover ${ring ? "ring-2 ring-white shadow-soft" : ""} ${className}`}
      />
    );
  }

  return (
    <div
      style={{
        width: px,
        height: px,
        background: cor,
      }}
      className={`rounded-full flex items-center justify-center text-white font-display font-bold select-none ${
        ring ? "ring-2 ring-white shadow-soft" : ""
      } ${className}`}
      aria-label={nomeExibido(profile)}
    >
      <span style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}>{iniciais}</span>
    </div>
  );
}
