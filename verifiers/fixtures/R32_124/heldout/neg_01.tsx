import i18next from "i18next";

export const initI18n = async (): Promise<void> => {
  await i18next.init({ lng: "en", resources: {} });
};

export function Greeting({ name }: { name: string }) {
  return <p>{i18next.t("hello", { name })}</p>;
}
