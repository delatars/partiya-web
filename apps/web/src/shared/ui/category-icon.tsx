import {
  AirVent,
  Anvil,
  Armchair,
  Bolt,
  BrickWall,
  CarFront,
  CircleDotDashed,
  Cylinder,
  Droplet,
  Fan,
  Factory,
  Faucet,
  FireExtinguisher,
  FlaskConical,
  Gauge,
  type LucideIcon,
  Microscope,
  MonitorSmartphone,
  Package,
  Paperclip,
  Shirt,
  Torus,
  Tractor,
  Wind,
  Wrench,
  Zap,
} from "lucide-react";

/* Иллюстрации категорий — свои: контурные иконки lucide-react (уже в зависимостях) одной
   толщины линии и одного цвета. Картинки со скриншотов-референсов (cat1–3.jpg) взяты
   с чужого сайта — в продукт их не берём (DECISIONS.md, «Уточнения», п. 28). */
const ICONS: Record<string, LucideIcon> = {
  tekstil: Shirt,
  "rezinotekhnicheskie-izdeliya": Torus,
  "avtozapchasti-i-aksessuary": CarFront,
  "laboratornoe-oborudovanie": Microscope,
  "it-i-bytovaya-tekhnika": MonitorSmartphone,
  "truboprovodnaya-armatura": Faucet,
  "khimicheskaya-produktsiya": FlaskConical,
  "klimaticheskoe-oborudovanie": AirVent,
  mebel: Armchair,
  "masla-i-smazki": Droplet,
  upakovka: Package,
  metall: Anvil,
  "pnevmaticheskoe-oborudovanie": Wind,
  "stroitelnye-materialy": BrickWall,
  "pozharnoe-oborudovanie": FireExtinguisher,
  "ofisnye-i-khozyaystvennye-tovary": Paperclip,
  elektrotekhnika: Zap,
  "gidravlicheskoe-oborudovanie": Cylinder,
  "zapchasti-dlya-spetstekhniki": Tractor,
  instrument: Wrench,
  kipia: Gauge,
  podshipniki: CircleDotDashed,
  nasosy: Fan,
  "metizy-i-krepezh": Bolt,
};

/** Иконка категории по слагу; у неизвестной категории — общий «завод». */
export function categoryIcon(slug: string): LucideIcon {
  return ICONS[slug] ?? Factory;
}

/** Слаги, для которых иконка подобрана, — для теста «у каждой категории своя иконка». */
export const CATEGORY_ICON_SLUGS: readonly string[] = Object.keys(ICONS);
