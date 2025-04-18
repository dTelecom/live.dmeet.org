'use client';

import type { LocalUserChoices } from "@dtelecom/components-react";
import { PreJoin } from "@dtelecom/components-react";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/ui/NavBar/NavBar";
import { Footer } from "@/components/ui/Footer/Footer";
import axios from "axios";
import { isMobileBrowser } from "@dtelecom/components-core";
import styles from "./Join.module.scss";
import { languageOptions } from "@/lib/languageOptions";
import { IGetRoomResponse } from "@/app/api/getRoom/route";
import { ParticipantsBadge } from "@/components/ui/ParticipantsBadge/ParticipantsBadge";
import { getCookie, setCookie } from '@/app/actions';
import { Button } from "@/components/ui";
import { clsx } from "clsx";
import { ChainIcon, TickIcon } from "@/assets";

const JoinRoomPage = () => {
  const router = useRouter();
  const { slug } = useParams();
  const params = useSearchParams();
  const name = params.get("roomName") || "";
  const isMobile = React.useMemo(() => isMobileBrowser(), []);

  const [preJoinChoices, setPreJoinChoices] = useState<
    Partial<LocalUserChoices>
  >({
    username: "",
    videoEnabled: false,
    audioEnabled: false
  });

  const [roomName] = useState<string>(name);
  const [wsUrl, setWsUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState<number>();

  useEffect(() => {
    getCookie('username').then((cookie) => {
      setPreJoinChoices((prev) => ({
        ...prev,
        username: cookie || ''
      }));
    });

    async function fetchRoom() {
      const { data } = await axios.post<IGetRoomResponse>(`/api/getRoom?slug=${slug}`);
      setParticipantsCount(data.participantsCount || 0);
    }

    async function fetchWsUrl() {
      try {
        const { data } = await axios.get(`/api/getWsUrl`);
        setWsUrl(data.wsUrl);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRoom();
    void fetchWsUrl();
  }, [router, slug]);

  const onJoin = async (values: Partial<LocalUserChoices>) => {
    console.log("Joining with: ", values);
    setIsLoading(true);
    const { data } = await axios.post(`/api/join`, {
      wsUrl,
      slug,
      name: values?.username || "",
    });
    await setCookie('username', values?.username || '', window.location.origin);

    await router.push(`/room/${data.slug}?token=${data.token}&wsUrl=${data.url}&preJoinChoices=${JSON.stringify(values)}&roomName=${data.roomName || name}`);

    setIsLoading(false);
  };

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = encodeURI(
      `${window.location.origin}/join/${slug}?roomName=${roomName}`
    );
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (roomName === undefined) {
    return null;
  }

  return (
    <>
      <NavBar
        title={roomName || name}
        small
        iconFull={!isMobile}
      >
        {participantsCount !== undefined && (
          <ParticipantsBadge count={participantsCount} />
        )}
        {isMobile ? (
          <Button
            onClick={() => {
              void copy();
            }}
            className={clsx(
              "lk-button",
              styles.copyButton,
              copied && styles.copied
            )}
            size={"sm"}
            variant={"default"}
          >
            <span>{copied ? <TickIcon /> : <ChainIcon />}</span>
          </Button>
        ) : <div />}
      </NavBar>

      <div className={styles.container}>
        <PreJoin
          onError={(err) => console.log("error while setting up prejoin", err)}
          defaults={preJoinChoices}
          onSubmit={(values) => {
            setPreJoinChoices(values);
            void onJoin(values);
          }}
          onValidate={(values) => {
            if (!values.username || values.username.length < 1 || isLoading) {
              return false;
            }
            return true;
          }}
          userLabel={"Enter your name"}
          isLoading={isLoading}
          languageOptions={languageOptions}
          disableVideo={true}
          formTitle={"Join the stream:"}
        />
      </div>

      <Footer />
    </>
  );
};

export default JoinRoomPage;
