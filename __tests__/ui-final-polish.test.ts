import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const loginPage = fs.readFileSync(path.resolve(__dirname, "../app/login/page.tsx"), "utf-8");
const registerPage = fs.readFileSync(path.resolve(__dirname, "../app/register/page.tsx"), "utf-8");
const historyPage = fs.readFileSync(path.resolve(__dirname, "../app/history/page.tsx"), "utf-8");
const commentCard = fs.readFileSync(path.resolve(__dirname, "../app/components/CommentCard.tsx"), "utf-8");
const tweetCard = fs.readFileSync(path.resolve(__dirname, "../app/components/TweetCard.tsx"), "utf-8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf-8");

describe("final UI polish markers", () => {
  it("auth pages should include the shared auth hero structure", () => {
    expect(loginPage).toContain("auth-hero");
    expect(loginPage).toContain("auth-kicker");
    expect(registerPage).toContain("auth-hero");
    expect(registerPage).toContain("auth-kicker");
  });

  it("history page should include the history stage framing", () => {
    expect(historyPage).toContain("history-stage");
    expect(historyPage).toContain("history-stage-copy");
    expect(historyPage).toContain("history-stage-kicker");
  });

  it("comment and tweet cards should use the premium result card structure", () => {
    expect(commentCard).toContain("result-card-premium");
    expect(commentCard).toContain("result-card-top");
    expect(commentCard).toContain("result-card-copy");
    expect(tweetCard).toContain("result-card-premium");
    expect(tweetCard).toContain("result-card-top");
    expect(tweetCard).toContain("result-card-copy");
  });

  it("shared CSS should define auth, history, and premium card styles", () => {
    expect(css).toContain(".auth-hero");
    expect(css).toContain(".auth-kicker");
    expect(css).toContain(".history-stage");
    expect(css).toContain(".result-card-premium");
    expect(css).toContain(".result-card-top");
    expect(css).toContain(".result-card-copy");
  });
});
