import assert from "node:assert";
import express from "express";
import path from "node:path";
import { afterEach, before, describe, it, mock } from "node:test";
import { Rider } from "@shared/schema";
import request from "../test-utils/supertest";

let updateRiderImage: typeof import("./riderImages.controller")["updateRiderImage"];
let storageModule: typeof import("../storage");
let downloadResult: {
  finalPath: string;
  mimeType: string;
  sha256: string;
  byteLength: number;
};

const baseRider: Rider = {
  id: 1,
  riderId: "r-1",
  uciId: "uci-1",
  datarideObjectId: null,
  datarideTeamCode: null,
  name: "Jordan Casey",
  firstName: "Jordan",
  lastName: "Casey",
  gender: "male",
  category: "elite",
  team: "Test Team",
  cost: 100000,
  lastYearStanding: 0,
  image: "",
  imageSource: "placeholder",
  imageOriginalUrl: null,
  imageUpdatedAt: null,
  imageContentHash: null,
  imageMimeType: null,
  country: "US",
  points: 0,
  form: "[]",
  injured: false,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post("/api/admin/riders/:uciId/image", updateRiderImage);
  return app;
}

before(async () => {
  process.env.DATABASE_URL ||= "postgresql://user:pass@localhost:5432/testdb";
  downloadResult = {
    finalPath: path.join(process.cwd(), "uploads", "riders", "sample.webp"),
    mimeType: "image/webp",
    sha256: "placeholder",
    byteLength: 512,
  };
  const controllerModule = await import("./riderImages.controller");
  updateRiderImage = controllerModule.updateRiderImage;
  controllerModule.__setImageFetcherForTests({
    validateRemoteImageUrl: async (value: string) => new URL(value),
    downloadImageToFile: async () => downloadResult,
  });
  storageModule = await import("../storage");
});

afterEach(() => {
  mock.restoreAll();
});

describe("updateRiderImage", () => {
  it("updates metadata when storing an external URL", async () => {
    const rider = { ...baseRider };
    const updateSpy = mock.method(storageModule.storage as any, "updateRider", async (_id, data) => {
      return { ...rider, ...data };
    });
    const getRiderMock = mock.method(storageModule.storage as any, "getRiderByUciId", async () => rider);

    const app = buildApp();
    const response = await request(app).post("/api/admin/riders/uci-1/image", {
      mode: "external",
      url: "https://img.test/photo.jpg",
    });

    assert.equal(response.status, 200);
    const args = updateSpy.mock.calls[0]?.arguments ?? [];
    assert.equal(args[0], rider.id);
    const updated = args[1] as Record<string, unknown>;
    assert.equal(updated.imageSource, "manual_url");
    assert.equal(updated.imageOriginalUrl, "https://img.test/photo.jpg");
    assert.equal(updated.image, "https://img.test/photo.jpg");
    assert.ok(updated.imageUpdatedAt instanceof Date);
    updateSpy.mock.restore();
    getRiderMock.mock.restore();
  });

  it("downloads, stores, and records hashes for copied images", async () => {
    const rider = { ...baseRider, uciId: "uci-9" };
    const finalPath = path.join(process.cwd(), "uploads", "riders", "uci-9.webp");
    downloadResult = {
      finalPath,
      mimeType: "image/webp",
      sha256: "abc123",
      byteLength: 1024,
    };

    const updateSpy = mock.method(storageModule.storage as any, "updateRider", async (_id, data) => {
      return { ...rider, ...data };
    });
    const getRiderMock = mock.method(storageModule.storage as any, "getRiderByUciId", async () => rider);

    const app = buildApp();
    const response = await request(app).post("/api/admin/riders/uci-9/image", {
      mode: "copy",
      url: "https://img.test/keep.png",
    });

    assert.equal(response.status, 200);
    const args = updateSpy.mock.calls[0]?.arguments ?? [];
    const updated = args[1] as Record<string, unknown>;
    assert.equal(updated.imageSource, "manual_copied");
    assert.equal(updated.imageOriginalUrl, "https://img.test/keep.png");
    assert.equal(updated.image, `/uploads/riders/${path.basename(finalPath)}`);
    assert.equal(updated.imageMimeType, "image/webp");
    assert.equal(updated.imageContentHash, "abc123");
    assert.ok(updated.imageUpdatedAt instanceof Date);
    updateSpy.mock.restore();
    getRiderMock.mock.restore();
  });
});
