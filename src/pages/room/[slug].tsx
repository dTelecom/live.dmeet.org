import type { LocalUserChoices } from "@dtelecom/components-react";
import {
  formatChatMessageLinks,
  LiveKitRoom,
  useChat,
  useLocalParticipant,
  useRoomContext,
  Livestream
} from "@dtelecom/components-react";
import React, { useEffect, useMemo } from "react";
import type { GetServerSideProps, NextPage } from "next";
import type { RoomOptions } from "@dtelecom/livekit-client";
import { LogLevel, RoomEvent, VideoPresets } from "@dtelecom/livekit-client";
import { useRouter } from "next/router";
import { DebugMode } from "@/lib/Debug";
import { Footer } from "@/components/ui/Footer/Footer";
import axios from "axios";
import { RoomNavBar } from "@/components/ui/RoomNavBar/RoomNavBar";
import { isMobileBrowser } from "@dtelecom/components-core";
import { VoiceRecognition } from "@/lib/VoiceRecognition";
import { debounce } from "ts-debounce";
import { languageOptions } from "@/lib/languageOptions";

interface Props {
  slug: string;
  token: string;
  wsUrl: string;
  preJoinChoices: LocalUserChoices | null;
  roomName: string;
  isAdmin?: boolean;
}

const RoomWrapper: NextPage<Props> = ({
  slug,
  roomName,
  isAdmin,
  preJoinChoices,
  wsUrl,
  token
}) => {
  const router = useRouter();

  useEffect(() => {
    void router.replace(router.pathname.replace("[slug]", slug), undefined, {
      shallow: true
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wsUrl) {
      void router.push(`/join/${slug}`);
    }
  }, [router, slug, wsUrl]);

  const { hq } = router.query;
  const roomOptions = useMemo((): RoomOptions => {
    return {
      videoCaptureDefaults: {
        deviceId: preJoinChoices?.videoDeviceId ?? undefined,
        resolution: hq === "true" ? VideoPresets.h2160 : VideoPresets.h720
      },
      publishDefaults: {
        videoSimulcastLayers:
          hq === "true"
            ? [VideoPresets.h1080, VideoPresets.h720]
            : [VideoPresets.h360, VideoPresets.h180],
        stopMicTrackOnMute: true
      },
      audioCaptureDefaults: {
        deviceId: preJoinChoices?.audioDeviceId ?? undefined
      },
      adaptiveStream: {
        pauseWhenNotVisible: true,
        pauseVideoInBackground: true
      },
      dynacast: false
    };
  }, [preJoinChoices, hq]);

  const onDisconnected = async () => {
    if (isAdmin) {
      await axios.post("/api/deleteRoom", { slug }, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
    }

    void router.push("/");
  };

  return (
    <>
      {wsUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          options={roomOptions}
          video={preJoinChoices?.videoEnabled}
          audio={preJoinChoices?.audioEnabled}
          onDisconnected={() => void onDisconnected()}
        >
          <div
            id="test-server-url"
            style={{
              display: "none"
            }}
          >
            {wsUrl}
          </div>

          <WrappedLiveKitRoom
            roomName={roomName}
            slug={slug}
            isAdmin={isAdmin}
            preJoinChoices={preJoinChoices}
            token={token}
          />
        </LiveKitRoom>
      )}

      <Footer />
    </>
  );
};

interface IWrappedLiveKitRoomProps {
  isAdmin?: boolean;
  slug: string;
  roomName: string;
  preJoinChoices: LocalUserChoices | null;
  token: string;
}

const debouncedPlay = debounce(() => {
  void new Audio("/sounds/user-joined.mp3").play();
}, 1000);

const WrappedLiveKitRoom = ({
  isAdmin,
  slug,
  roomName,
  preJoinChoices,
  token
}: IWrappedLiveKitRoomProps) => {
  const isMobile = React.useMemo(() => isMobileBrowser(), []);
  const chatContext = useChat();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const play = () => {
      void debouncedPlay();
    };

    room.on(RoomEvent.ParticipantConnected, play);

    return () => {
      room.off(RoomEvent.ParticipantConnected, play);
    };
  }, [room]);

  const onMute = (participantIdentity: string, trackSid: string) => {
    void axios.post("/api/admin", {
      method: "mute",
      adminIdentity: localParticipant.identity,
      participantIdentity,
      trackSid,
      room: slug
    }, {
      headers: {
        authorization: `Bearer ${token}`
      }
    });
  };

  const onKick = (participantIdentity: string) => {
    void axios.post("/api/admin", {
      method: "kick",
      adminIdentity: localParticipant.identity,
      participantIdentity,
      room: slug
    });
  };

  return (
    <>
      <RoomNavBar
        roomName={roomName}
        slug={slug}
        iconFull={!isMobile}
      />

      <Livestream
        chatMessageFormatter={formatChatMessageLinks}
        onKick={isAdmin ? onKick : undefined}
        onMute={isAdmin ? onMute : undefined}
        isAdmin={isAdmin}
        localIdentity={localParticipant.identity}
        chatContext={chatContext}
        languageOptions={languageOptions}
        supportedChatMessageTypes={["text", "transcription"]}
      />

      <DebugMode
        logLevel={
          process.env.NODE_ENV === "development"
            ? LogLevel.debug
            : LogLevel.info
        }
      />

      {token && (
        <VoiceRecognition
          token={token}
          language={preJoinChoices?.language}
          chatContext={chatContext}
        />
      )}
    </>
  );
};

export default RoomWrapper;

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
  query
}) => {
  const preJoinChoices: LocalUserChoices | null = query?.preJoinChoices
    ? (JSON.parse(query.preJoinChoices as string) as LocalUserChoices)
    : null;
  return Promise.resolve({
    props: {
      slug: params?.slug as string,
      token: (query?.token || "") as string,
      wsUrl: (query?.wsUrl || "") as string,
      preJoinChoices,
      roomName: (query?.roomName || "") as string,
      isAdmin: query?.isAdmin === "true",
    }
  });
};
