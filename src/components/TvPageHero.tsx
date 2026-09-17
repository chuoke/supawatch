import TitleDetailHero, { type DetailHeroProps } from "@/components/TitleDetailHero";

export default function TvPageHero(props: Omit<DetailHeroProps, "type">) {
  return <TitleDetailHero key={props.id} {...props} type="tv" />;
}
