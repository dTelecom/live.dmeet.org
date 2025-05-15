"use client";

import type { LocalUserChoices } from "@dtelecom/components-react";
import {
  formatChatMessageLinks,
  LiveKitRoom,
  Livestream,
  useChat,
  useLocalParticipant,
  useRoomContext
} from "@dtelecom/components-react";
import React, { useEffect, useMemo } from "react";
import type { NextPage } from "next";
import type { RoomOptions } from "@dtelecom/livekit-client";
import { LogLevel, RoomEvent, VideoPresets } from "@dtelecom/livekit-client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { DebugMode } from "@/lib/Debug";
import { Footer } from "@/components/ui/Footer/Footer";
import axios from "axios";
import { RoomNavBar } from "@/components/ui/RoomNavBar/RoomNavBar";
import { isMobileBrowser } from "@dtelecom/components-core";
import { VoiceRecognition } from "@/lib/VoiceRecognition";
import { debounce } from "ts-debounce";
import { languageOptions } from "@/lib/languageOptions";

type RoomState = {
  slug: string;
  token: string;
  wsUrl: string;
  roomName: string;
  isAdmin: boolean;
  hq: boolean;
  preJoinChoices: LocalUserChoices | null;
}

const useRoomParams = () => {
  const params = useSearchParams();
  const p = useParams();
  const slug = p.slug as string || "";

  const token = params.get("token") || "";
  const wsUrl = params.get("wsUrl") || "";
  const roomName = params.get("roomName") || "";
  const isAdmin = params.get("isAdmin") === "true";
  const hq = params.get("hq") === "true";
  const preJoinChoices = useMemo(() => {
    const choices = params.get("preJoinChoices");
    return choices ? (JSON.parse(choices) as LocalUserChoices | null) : null;
  }, [params]);

  // store everything in state
  const [roomState] = React.useState<RoomState>({
    slug,
    token,
    wsUrl,
    roomName,
    isAdmin,
    hq,
    preJoinChoices
  });

  return { ...roomState };
};


const useRoomOptions = (preJoinChoices: LocalUserChoices | null, hq: boolean): RoomOptions => {
  return useMemo((): RoomOptions => {
    return {
      videoCaptureDefaults: {
        deviceId: preJoinChoices?.videoDeviceId ?? undefined,
        resolution: hq ? VideoPresets.h2160 : VideoPresets.h720,
      },
      publishDefaults: {
        videoSimulcastLayers: hq
          ? [VideoPresets.h1080, VideoPresets.h720]
          : [VideoPresets.h360, VideoPresets.h180],
        stopMicTrackOnMute: true,
      },
      audioCaptureDefaults: {
        deviceId: preJoinChoices?.audioDeviceId ?? undefined,
      },
      adaptiveStream: {
        pauseWhenNotVisible: false,
        pauseVideoInBackground: true,
      },
      dynacast: false,
    };
  }, [preJoinChoices, hq]);
};

const RoomWrapper: NextPage = () => {
  const router = useRouter();
  const { slug, token, wsUrl, roomName, isAdmin, hq, preJoinChoices } = useRoomParams();
  const roomOptions = useRoomOptions(preJoinChoices, hq);
  const startTime = React.useRef(Date.now());

  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, [router, slug, token]);

  useEffect(() => {
    if (!wsUrl) {
      void router.replace(`/join/${slug}`);
    }
  }, [router, slug, wsUrl]);

  const onDisconnected = async () => {
    if (isAdmin) {
      try {
        await axios.post(
          "/api/deleteRoom",
          { slug },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (error) {
        console.error("Error deleting room:", error);
        // Optionally handle the error, e.g., show a notification
      }
    }
    if (process.env.NEXT_PUBLIC_POINTS_BACKEND_URL) {
      const time = Math.floor((Date.now() - startTime.current) / 1000);
      void router.push("/summary?roomName=" + roomName + "&timeSec=" + time + "&isAdmin=" + isAdmin + "&slug=" + slug);
    } else {
      void router.push("/");
    }
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
          onDisconnected={onDisconnected}
          activityModalEnabled={isAdmin}
        >
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

interface WrappedLiveKitRoomProps {
  isAdmin?: boolean;
  slug: string;
  roomName: string;
  preJoinChoices: LocalUserChoices | null;
  token: string;
}

const USER_JOINED_SOUND_PATH = "/sounds/user-joined.mp3";
const USER_JOINED_DEBOUNCE_DELAY = 1000;

const debouncedPlay = debounce(() => {
  void new Audio(USER_JOINED_SOUND_PATH).play();
}, USER_JOINED_DEBOUNCE_DELAY);

const WrappedLiveKitRoom = ({
  isAdmin,
  slug,
  roomName,
  preJoinChoices,
  token
}: WrappedLiveKitRoomProps) => {
  const isMobile = useMemo(() => isMobileBrowser(), []);
  const chatContext = useChat();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const handleParticipantConnected = () => {
      void debouncedPlay();
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room]);

  const handleAdminAction = async (method: "mute" | "kick", participantIdentity: string, trackSid?: string) => {
    try {
      await axios.post(
        "/api/admin",
        {
          method,
          participantIdentity,
          trackSid,
          room: slug,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error(`Error performing admin action (${method}):`, error);
      // Optionally handle the error, e.g., show a notification
    }
  };

  const onMute = isAdmin
    ? (participantIdentity: string, trackSid: string) =>
      void handleAdminAction("mute", participantIdentity, trackSid)
    : undefined;

  const onKick = isAdmin
    ? (participantIdentity: string) => void handleAdminAction("kick", participantIdentity)
    : undefined;

  return (
    <>
      <RoomNavBar
        roomName={roomName}
        slug={slug}
        iconFull={!isMobile}
        isAdmin={isAdmin}
        token={token}
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
