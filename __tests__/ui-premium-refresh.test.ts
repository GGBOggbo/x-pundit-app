import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const homePagePath = path.resolve(__dirname, "../app/page.tsx");
const tweetPagePath = path.resolve(__dirname, "../app/generate-tweets/page.tsx");
const cssPath = path.resolve(__dirname, "../app/globals.css");

const homePage = fs.readFileSync(homePagePath, "utf-8");
const tweetPage = fs.readFileSync(tweetPagePath, "utf-8");
const css = fs.readFileSync(cssPath, "utf-8");

describe("premium workspace refresh", () => {
  it("home page should use the new workspace hero and result-stage framing", () => {
    expect(homePage).toContain("workspace-hero workspace-hero-comment");
    expect(homePage).toContain("workspace-eyebrow");
    expect(homePage).toContain("result-stage");
    expect(homePage).toContain("task-launch-bar");
  });

  it("tweet page should use the new workspace hero and source preparation framing", () => {
    expect(tweetPage).toContain("workspace-hero workspace-hero-tweet");
    expect(tweetPage).toContain("source-prep-header");
    expect(tweetPage).toContain("source-prep-count");
    expect(tweetPage).toContain("result-stage");
  });

  it("shared CSS should define the premium workspace visual system", () => {
    expect(css).toContain(".workspace-hero");
    expect(css).toContain(".workspace-hero-side");
    expect(css).toContain(".workspace-stat");
    expect(css).toContain(".task-launch-bar");
    expect(css).toContain(".source-prep-header");
    expect(css).toContain(".result-stage");
  });
});
