import TitleDetailHero, { type DetailHeroProps } from "@/components/TitleDetailHero";

export default function MoviePageHero(props: Omit<DetailHeroProps, "type">) {
  return <TitleDetailHero key={props.id} {...props} type="movie" />;
}
