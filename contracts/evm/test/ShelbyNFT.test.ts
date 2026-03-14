/**
 * contracts/evm/test/ShelbyNFT.test.ts
 *
 * Fixes applied:
 *  1. Removed typechain-types import — typechain generates AFTER compile,
 *     so the import breaks before first `hardhat compile`. We define local
 *     interfaces and cast with `as unknown as IFace` instead.
 *  2. Fixed bigint arithmetic — in ethers v6, receipt.gasUsed and receipt.gasPrice
 *     are already bigint. closeTo() delta must also be bigint.
 *  3. Custom contract methods (ownerMint, togglePublicMint, etc.) accessed via
 *     the typed interface casts — no "does not exist on BaseContract" errors.
 *
 * After running `npx hardhat compile` typechain-types/ is generated.
 * You can then replace the interface block with:
 *   import { ShelbyNFT, ShelbyNFTFactory } from "../typechain-types";
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type { BaseContract } from "ethers";

// ── Local typed interfaces (replaces typechain until first compile) ─────────

interface IShelbyNFT extends BaseContract {
  name(): Promise<string>;
  symbol(): Promise<string>;
  totalSupply(): Promise<bigint>;
  maxSupply(): Promise<bigint>;
  mintPrice(): Promise<bigint>;
  publicMintEnabled(): Promise<boolean>;
  baseTokenURI(): Promise<string>;
  ownerOf(tokenId: bigint): Promise<string>;
  tokenURI(tokenId: bigint): Promise<string>;
  getShelbyCID(tokenId: bigint): Promise<string>;
  mint(to: string, cid: string, opts?: { value: bigint }): Promise<any>;
  ownerMint(to: string, cid: string): Promise<any>;
  batchMint(to: string, cids: string[], opts?: { value: bigint }): Promise<any>;
  togglePublicMint(): Promise<any>;
  setBaseURI(uri: string): Promise<any>;
  setMintPrice(price: bigint): Promise<any>;
  pause(): Promise<any>;
  unpause(): Promise<any>;
  withdraw(): Promise<any>;
  connect(signer: SignerWithAddress): IShelbyNFT;
}

interface IShelbyNFTFactory extends BaseContract {
  owner(): Promise<string>;
  deploymentFee(): Promise<bigint>;
  getTotalCollections(): Promise<bigint>;
  getCreatorCollections(creator: string): Promise<
    Array<{
      contractAddress: string;
      name: string;
      symbol: string;
      creator: string;
      createdAt: bigint;
    }>
  >;
  setDeploymentFee(fee: bigint): Promise<any>;
  deployCollection(
    name: string,
    symbol: string,
    maxSupply: bigint,
    mintPrice: bigint,
    baseURI: string,
    opts?: { value: bigint }
  ): Promise<any>;
  withdraw(): Promise<any>;
  connect(signer: SignerWithAddress): IShelbyNFTFactory;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEPLOYMENT_FEE = ethers.parseEther("0.001");
const MINT_PRICE     = ethers.parseEther("0.01");
const MAX_SUPPLY     = 100n;
/** Tolerance for closeTo assertions — covers gas cost variance */
const DELTA          = ethers.parseEther("0.0001");

const SAMPLE_CID   = "0xabc123/nfts/test-col/metadata/1.json";
const SAMPLE_CID_2 = "0xabc123/nfts/test-col/metadata/2.json";

// ── Helper: total gas cost from a sent tx ─────────────────────────────────
async function gasCost(tx: any): Promise<bigint> {
  const receipt = await tx.wait();
  // ethers v6: gasUsed and gasPrice are already bigint
  const used:  bigint = receipt!.gasUsed  as bigint;
  const price: bigint = receipt!.gasPrice as bigint;
  return used * price;
}

// ── Factory tests ──────────────────────────────────────────────────────────

describe("ShelbyNFTFactory", function () {
  let factory: IShelbyNFTFactory;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ShelbyNFTFactory");
    const deployed = await Factory.deploy(owner.address);
    await deployed.waitForDeployment();
    factory = deployed as unknown as IShelbyNFTFactory;
  });

  it("deploys with correct owner", async () => {
    expect(await factory.owner()).to.equal(owner.address);
  });

  it("has correct default deployment fee", async () => {
    expect(await factory.deploymentFee()).to.equal(DEPLOYMENT_FEE);
  });

  it("owner can update deployment fee", async () => {
    const newFee = ethers.parseEther("0.002");
    await factory.connect(owner).setDeploymentFee(newFee);
    expect(await factory.deploymentFee()).to.equal(newFee);
  });

  it("non-owner cannot update deployment fee", async () => {
    await expect(
      factory.connect(alice).setDeploymentFee(ethers.parseEther("0.002"))
    ).to.be.revertedWithCustomError(factory as any, "OwnableUnauthorizedAccount");
  });

  describe("deployCollection", () => {
    it("deploys a collection and emits CollectionDeployed", async () => {
      const tx = await factory
        .connect(alice)
        .deployCollection("Test Collection", "TEST", MAX_SUPPLY, MINT_PRICE, "", {
          value: DEPLOYMENT_FEE,
        });
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      await expect(tx)
        .to.emit(factory as any, "CollectionDeployed")
        .withArgs(
          alice.address,
          (addr: string) => ethers.isAddress(addr),
          "Test Collection",
          "TEST"
        );
    });

    it("reverts if insufficient deployment fee", async () => {
      await expect(
        factory
          .connect(alice)
          .deployCollection("Test", "T", MAX_SUPPLY, MINT_PRICE, "", {
            value: ethers.parseEther("0.0001"),
          })
      ).to.be.revertedWith("Insufficient deployment fee");
    });

    it("reverts if name is empty", async () => {
      await expect(
        factory
          .connect(alice)
          .deployCollection("", "T", MAX_SUPPLY, MINT_PRICE, "", {
            value: DEPLOYMENT_FEE,
          })
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("stores collection info on creator", async () => {
      await factory
        .connect(alice)
        .deployCollection("My NFTs", "MNFT", MAX_SUPPLY, MINT_PRICE, "", {
          value: DEPLOYMENT_FEE,
        });

      const cols = await factory.getCreatorCollections(alice.address);
      expect(cols.length).to.equal(1);
      expect(cols[0].name).to.equal("My NFTs");
      expect(cols[0].symbol).to.equal("MNFT");
      expect(cols[0].creator).to.equal(alice.address);
    });

    it("increments total collections count", async () => {
      await factory
        .connect(alice)
        .deployCollection("A", "A", MAX_SUPPLY, MINT_PRICE, "", { value: DEPLOYMENT_FEE });
      await factory
        .connect(bob)
        .deployCollection("B", "B", MAX_SUPPLY, MINT_PRICE, "", { value: DEPLOYMENT_FEE });

      expect(await factory.getTotalCollections()).to.equal(2n);
    });
  });

  describe("withdraw", () => {
    it("owner can withdraw collected fees", async () => {
      await factory
        .connect(alice)
        .deployCollection("A", "A", MAX_SUPPLY, MINT_PRICE, "", { value: DEPLOYMENT_FEE });

      const balBefore = await ethers.provider.getBalance(owner.address);
      const tx        = await factory.connect(owner).withdraw();
      const gas       = await gasCost(tx);
      const balAfter  = await ethers.provider.getBalance(owner.address);

      // balAfter ≈ balBefore + DEPLOYMENT_FEE - gas  (all bigint)
      expect(balAfter).to.be.closeTo(balBefore + DEPLOYMENT_FEE - gas, DELTA);
    });

    it("non-owner cannot withdraw", async () => {
      await expect(
        factory.connect(alice).withdraw()
      ).to.be.revertedWithCustomError(factory as any, "OwnableUnauthorizedAccount");
    });
  });
});

// ── ShelbyNFT tests ────────────────────────────────────────────────────────

describe("ShelbyNFT", function () {
  let nft: IShelbyNFT;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const NFT = await ethers.getContractFactory("ShelbyNFT");
    const deployed = await NFT.deploy(
      "Shelby Test Collection",
      "SHELBY",
      MAX_SUPPLY,
      MINT_PRICE,
      "",
      owner.address
    );
    await deployed.waitForDeployment();
    nft = deployed as unknown as IShelbyNFT;
  });

  it("has correct name, symbol, maxSupply", async () => {
    expect(await nft.name()).to.equal("Shelby Test Collection");
    expect(await nft.symbol()).to.equal("SHELBY");
    expect(await nft.maxSupply()).to.equal(MAX_SUPPLY);
  });

  it("public mint is disabled by default", async () => {
    expect(await nft.publicMintEnabled()).to.equal(false);
  });

  describe("ownerMint", () => {
    it("owner can mint for free", async () => {
      await nft.connect(owner).ownerMint(alice.address, SAMPLE_CID);
      expect(await nft.totalSupply()).to.equal(1n);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("stores the Shelby CID correctly", async () => {
      await nft.connect(owner).ownerMint(alice.address, SAMPLE_CID);
      expect(await nft.getShelbyCID(1n)).to.equal(SAMPLE_CID);
    });

    it("tokenURI returns shelby:// prefixed CID", async () => {
      await nft.connect(owner).ownerMint(alice.address, SAMPLE_CID);
      expect(await nft.tokenURI(1n)).to.equal(`shelby://${SAMPLE_CID}`);
    });

    it("emits TokenMinted event", async () => {
      await expect(nft.connect(owner).ownerMint(alice.address, SAMPLE_CID))
        .to.emit(nft as any, "TokenMinted")
        .withArgs(1n, alice.address, SAMPLE_CID);
    });

    it("non-owner cannot owner mint", async () => {
      await expect(
        nft.connect(alice).ownerMint(alice.address, SAMPLE_CID)
      ).to.be.revertedWithCustomError(nft as any, "OwnableUnauthorizedAccount");
    });

    it("reverts on empty CID", async () => {
      await expect(
        nft.connect(owner).ownerMint(alice.address, "")
      ).to.be.revertedWith("Invalid Shelby CID");
    });
  });

  describe("public mint", () => {
    beforeEach(async () => {
      await nft.connect(owner).togglePublicMint();
    });

    it("anyone can mint after enabling", async () => {
      await nft.connect(alice).mint(alice.address, SAMPLE_CID, { value: MINT_PRICE });
      expect(await nft.totalSupply()).to.equal(1n);
    });

    it("reverts without sufficient payment", async () => {
      await expect(
        nft
          .connect(alice)
          .mint(alice.address, SAMPLE_CID, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("reverts if public mint is disabled", async () => {
      await nft.connect(owner).togglePublicMint(); // toggle back off
      await expect(
        nft.connect(alice).mint(alice.address, SAMPLE_CID, { value: MINT_PRICE })
      ).to.be.revertedWith("Public mint not enabled");
    });
  });

  describe("batchMint", () => {
    beforeEach(async () => {
      await nft.connect(owner).togglePublicMint();
    });

    it("mints multiple tokens in one tx", async () => {
      const cids = [SAMPLE_CID, SAMPLE_CID_2];
      await nft
        .connect(alice)
        .batchMint(alice.address, cids, { value: MINT_PRICE * BigInt(cids.length) });

      expect(await nft.totalSupply()).to.equal(BigInt(cids.length));
      expect(await nft.getShelbyCID(1n)).to.equal(SAMPLE_CID);
      expect(await nft.getShelbyCID(2n)).to.equal(SAMPLE_CID_2);
    });

    it("reverts with insufficient payment for batch", async () => {
      const cids = [SAMPLE_CID, SAMPLE_CID_2];
      await expect(
        nft.connect(alice).batchMint(alice.address, cids, { value: MINT_PRICE })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("reverts with empty CIDs array", async () => {
      await expect(
        nft.connect(alice).batchMint(alice.address, [], { value: 0n })
      ).to.be.revertedWith("Empty CIDs array");
    });
  });

  describe("max supply", () => {
    it("reverts when max supply is reached", async () => {
      const NFT = await ethers.getContractFactory("ShelbyNFT");
      const tiny = (await NFT.deploy(
        "Tiny", "TINY", 2n, 0n, "", owner.address
      )) as unknown as IShelbyNFT;
      await (tiny as any).waitForDeployment();

      await tiny.connect(owner).ownerMint(alice.address, SAMPLE_CID);
      await tiny.connect(owner).ownerMint(alice.address, SAMPLE_CID_2);

      await expect(
        tiny.connect(owner).ownerMint(alice.address, "third-cid")
      ).to.be.revertedWith("Max supply reached");
    });
  });

  describe("pause / unpause", () => {
    it("owner can pause and unpause", async () => {
      await nft.connect(owner).togglePublicMint();
      await nft.connect(owner).pause();

      await expect(
        nft.connect(alice).mint(alice.address, SAMPLE_CID, { value: MINT_PRICE })
      ).to.be.revertedWithCustomError(nft as any, "EnforcedPause");

      await nft.connect(owner).unpause();
      await nft.connect(alice).mint(alice.address, SAMPLE_CID, { value: MINT_PRICE });
      expect(await nft.totalSupply()).to.equal(1n);
    });
  });

  describe("admin setters", () => {
    it("owner can update base URI", async () => {
      await nft.connect(owner).setBaseURI("ipfs://newbase/");
      expect(await nft.baseTokenURI()).to.equal("ipfs://newbase/");
    });

    it("owner can update mint price", async () => {
      const newPrice = ethers.parseEther("0.05");
      await nft.connect(owner).setMintPrice(newPrice);
      expect(await nft.mintPrice()).to.equal(newPrice);
    });
  });

  describe("withdraw", () => {
    it("owner can withdraw mint proceeds", async () => {
      await nft.connect(owner).togglePublicMint();
      await nft.connect(alice).mint(alice.address, SAMPLE_CID, { value: MINT_PRICE });

      const balBefore = await ethers.provider.getBalance(owner.address);
      const tx        = await nft.connect(owner).withdraw();
      const gas       = await gasCost(tx);
      const balAfter  = await ethers.provider.getBalance(owner.address);

      // All values are bigint — no mixed arithmetic
      expect(balAfter).to.be.closeTo(balBefore + MINT_PRICE - gas, DELTA);
    });

    it("reverts when no funds to withdraw", async () => {
      await expect(
        nft.connect(owner).withdraw()
      ).to.be.revertedWith("No funds to withdraw");
    });
  });
});