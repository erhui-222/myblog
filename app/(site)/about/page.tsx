import type { Metadata } from "next";
import { ContactList } from "@/components/about/ContactList";
import { ProfileCard } from "@/components/about/ProfileCard";
import { SkillTags } from "@/components/about/SkillTags";
import { Timeline } from "@/components/about/Timeline";
import { aboutConfig, siteConfig } from "@/lib/site-config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "关于我",
  description: `${siteConfig.name} 的作者介绍、技能方向与联系方式。`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <div className="lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProfileCard
            name={aboutConfig.name}
            title={aboutConfig.title}
            bio={aboutConfig.bio}
          />
        </div>

        <div className="mt-10 space-y-10 lg:mt-0">
          <SkillTags groups={aboutConfig.skills} />
          <Timeline items={aboutConfig.timeline} />
          <ContactList contacts={aboutConfig.contacts} />
        </div>
      </div>
    </div>
  );
}
