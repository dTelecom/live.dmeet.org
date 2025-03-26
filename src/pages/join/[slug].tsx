import type { LocalUserChoices } from "@dtelecom/components-react";
import { PreJoin } from "@dtelecom/components-react";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NavBar } from "@/components/ui/NavBar/NavBar";
import type { GetServerSideProps } from "next";
import { Footer } from "@/components/ui/Footer/Footer";
import axios from "axios";
import type { IJoinResponse } from "@/pages/api/join";
import type { IGetRoomResponse } from "@/pages/api/getRoom";
import { isMobileBrowser } from "@dtelecom/components-core";
import type { IGetWsUrl } from "@/pages/api/getWsUrl";
import styles from "./Join.module.scss";
import { languageOptions } from "@/lib/languageOptions";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { ChainIcon, TickIcon } from "@/assets";
import { Button } from "@/components/ui";
import { ParticipantsBadge } from "@/components/ui/ParticipantsBadge/ParticipantsBadge";

interface Props {
  slug: string;
  roomName: string;
}

const JoinRoomPage = ({ slug, roomName: name }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isMobile = React.useMemo(() => isMobileBrowser(), []);

  const [identity] = useState<string>(searchParams.get("identity") || "");
  const [preJoinChoices, setPreJoinChoices] = useState<
    Partial<LocalUserChoices>
  >({
    username: "",
    videoEnabled: !!identity,
    audioEnabled: process.env.NODE_ENV !== "development" && !!identity
  });
  const [roomName, setRoomName] = useState<string>(name);
  const [wsUrl, setWsUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [participantsCount, setParticipantsCount] = useState<number>();

  const handleRemoveQuery = useCallback((paramToRemove) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete(paramToRemove);
    router.replace(`${pathname}?${currentParams.toString()}`);
  }, [router, pathname, searchParams]);

  useEffect(() => {
    async function fetchRoom(wsUrl) {
      const { data } = await axios.post<IGetRoomResponse>(
        `/api/getRoom?slug=${slug}`, {
          identity: identity || null,
          wsUrl
        }
      );
      if (data.roomDeleted) {
        void router.push("/");
      }
      setParticipantsCount(data.participantsCount || 0);
      setRoomName(data.roomName || name);
    }

    async function fetchWsUrl() {
      let wsUrl = null;
      try {
        const { data } = await axios.get<IGetWsUrl>(`/api/getWsUrl`);
        setWsUrl(data.wsUrl);
        wsUrl = data.wsUrl;
      } finally {
        setIsLoading(false);
      }
      return wsUrl;
    }

    void fetchWsUrl().then((wsUrl) => {
      void fetchRoom(wsUrl);
      handleRemoveQuery("identity");
    });
  }, []);

  const onJoin = async (values: Partial<LocalUserChoices>) => {
    console.log("Joining with: ", values);
    setIsLoading(true);
    const { data } = await axios.post<IJoinResponse>(`/api/join`, {
      wsUrl,
      slug,
      name: values?.username || "",
      identity: identity || null
    });

    await router.push({
      pathname: `/room/${data.slug}`,
      query: {
        token: data.token,
        wsUrl: data.url,
        preJoinChoices: JSON.stringify(values),
        roomName: data.roomName || name,
        isAdmin: data.isAdmin
      }
    });

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
        ) : <div/>}
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
          disableVideo={!identity}
          formTitle={!identity ? "Join the stream:" : ""}
        />
      </div>

      <Footer />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
  query
}) => {
  return Promise.resolve({
    props: {
      slug: params?.slug as string,
      roomName: (query?.roomName as string) || ""
    }
  });
};

export default JoinRoomPage;
