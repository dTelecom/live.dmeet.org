import "@rainbow-me/rainbowkit/styles.css";
import "@dtelecom/components-styles";
import "@dtelecom/components-styles/prefabs";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import Head from "next/head";
import type { PropsWithChildren } from "react";
import React from "react";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const MyApp = ({
  Component,
  pageProps
}: AppProps) => {
  return (
    <>
      <Head>
        <title>dMeet | Livestreaming</title>
      </Head>

      <QueryClientProvider client={queryClient}>
        <AppWrapper>
          <Component {...pageProps} />
        </AppWrapper>
      </QueryClientProvider>
    </>
  );
};

const AppWrapper = ({ children }: PropsWithChildren) => {
  return (
    <ThemeProvider forcedTheme={"dark"}>
      <main data-lk-theme="default">{children}</main>
    </ThemeProvider>
  );
};

export default MyApp;
