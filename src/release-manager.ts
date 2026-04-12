import {
  MetadataURIPublished,
  ReleasePublished,
} from "../generated/ReleaseManager/ReleaseManager";

import {
  AVS,
  OperatorSet,
  OperatorSetMetadataPublished,
  ReleasePublished as ReleasePublishedEntity,
  ReleaseArtifact,
} from "../generated/schema";

import { log, Address, BigInt } from "@graphprotocol/graph-ts";

// ========================================
// RELEASE MANAGER EVENTS
// ========================================

export function handleMetadataURIPublished(
  event: MetadataURIPublished,
): void {
  log.info("Processing MetadataURIPublished event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  let entity = new OperatorSetMetadataPublished(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString(),
  );

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.operatorSet = operatorSet.id;
  entity.metadataURI = event.params.metadataURI;

  operatorSet.save();
  entity.save();

  log.info("MetadataURIPublished event saved: {}", [entity.id]);
}

export function handleReleasePublished(event: ReleasePublished): void {
  log.info("Processing ReleasePublished event: {}", [
    event.transaction.hash.toHexString(),
  ]);

  let operatorSet = getOrCreateOperatorSet(
    event.params.operatorSet.avs,
    event.params.operatorSet.id,
  );

  let releaseId =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let entity = new ReleasePublishedEntity(releaseId);

  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.contractAddress = event.address;

  entity.operatorSet = operatorSet.id;
  entity.releaseId = event.params.releaseId;
  entity.upgradeByTime = BigInt.fromI32(
    event.params.release.upgradeByTime,
  );

  operatorSet.save();
  entity.save();

  // Create a ReleaseArtifact entity for each artifact in the release
  let artifacts = event.params.release.artifacts;
  for (let i = 0; i < artifacts.length; i++) {
    let artifact = new ReleaseArtifact(releaseId + "-" + i.toString());
    artifact.release = releaseId;
    artifact.artifactIndex = i;
    artifact.digest = artifacts[i].digest;
    artifact.registry = artifacts[i].registry;
    artifact.save();
  }

  log.info("ReleasePublished event saved with {} artifacts: {}", [
    artifacts.length.toString(),
    entity.id,
  ]);
}

// ========================================
// HELPERS
// ========================================

function getOrCreateAVS(address: Address): AVS {
  let avs = AVS.load(address.toHexString());
  if (avs == null) {
    avs = new AVS(address.toHexString());
    avs.address = address;
  }
  return avs;
}

function getOrCreateOperatorSet(
  avsAddress: Address,
  operatorSetId: BigInt,
): OperatorSet {
  let id = avsAddress.toHexString() + "-" + operatorSetId.toString();
  let operatorSet = OperatorSet.load(id);
  if (operatorSet == null) {
    operatorSet = new OperatorSet(id);
    operatorSet.avs = avsAddress.toHexString();
    operatorSet.operatorSetId = operatorSetId;

    let avs = getOrCreateAVS(avsAddress);
    avs.save();
  }
  return operatorSet;
}
