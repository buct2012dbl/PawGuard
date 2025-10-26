import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Create Pet DID on Hedera
 * POST /api/hedera/create-pet-did
 *
 * This endpoint creates a Hedera DID for a pet and returns the DID and topic ID
 * to be stored in the PetIdentity smart contract
 *
 * Mode-aware:
 * - Development: Returns mock DID for testing
 * - Production: Creates real Hedera DID using SDK
 */

// Get server-side config (uses process.env directly on server)
const getServerConfig = () => {
  const mode = process.env.NEXT_PUBLIC_APP_MODE || 'development';
  return {
    mode,
    hedera: {
      useMockDID: mode !== 'production',
      network: process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet',
      operatorId: process.env.HEDERA_OPERATOR_ID, // Server-side only
      operatorKey: process.env.HEDERA_OPERATOR_KEY, // Server-side only
    }
  };
};

export async function POST(request: NextRequest) {
  try {
    const config = getServerConfig();

    // Parse request body
    const body = await request.json();
    const { petId, owner, petData } = body;

    // Validate input
    if (!petId || !owner || !petData) {
      return NextResponse.json(
        { error: 'Missing required fields: petId, owner, petData' },
        { status: 400 }
      );
    }

    let did: string;
    let topicId: string;
    let document: any;

    if (config.hedera.useMockDID) {
      // DEVELOPMENT MODE: Return mock DID
      console.log('🔧 Development Mode: Creating mock Hedera DID');

      did = `did:hedera:testnet:z${Math.random().toString(36).substring(2, 15)}_0.0.${Math.floor(Math.random() * 100000)}`;
      topicId = `0.0.${Math.floor(Math.random() * 100000)}`;

      document = {
        '@context': 'https://www.w3.org/ns/did/v1',
        id: did,
        subject: {
          microchipId: petData.microchipId || `CHIP-${Date.now()}`,
          species: 'Dog',
          breed: petData.breed,
          name: petData.name,
          age: petData.age,
          ownerAddress: owner,
          nftId: petId
        }
      };

      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 300));

      return NextResponse.json({
        success: true,
        did,
        topicId,
        document,
        mode: 'development',
        message: '🔧 Mock DID created for local testing'
      });

    } else {
      // PRODUCTION MODE: Create real Hedera DID
      console.log('🌐 Production Mode: Creating real Hedera DID');

      // Validate Hedera credentials
      if (!config.hedera.operatorId || !config.hedera.operatorKey) {
        return NextResponse.json(
          {
            error: 'Hedera credentials not configured. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY environment variables.'
          },
          { status: 500 }
        );
      }

      // Import Hedera SDK (only in production)
      const { Client, PrivateKey, TopicCreateTransaction, TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
      const { HcsDid, HcsDidCreateDidDocumentTransaction, DidMethodOperation } = await import('@hashgraph/did-sdk-js');

      // Create Hedera client
      const client = Client.forTestnet();
      client.setOperator(
        config.hedera.operatorId,
        PrivateKey.fromString(config.hedera.operatorKey)
      );

      // Create a new HCS topic for the DID
      const topicCreateTx = new TopicCreateTransaction()
        .setSubmitKey(client.operatorPublicKey!)
        .setAdminKey(client.operatorPublicKey!);

      const topicCreateSubmit = await topicCreateTx.execute(client);
      const topicCreateReceipt = await topicCreateSubmit.getReceipt(client);
      const hcsTopicId = topicCreateReceipt.topicId!;

      topicId = hcsTopicId.toString();

      // Create the DID
      const didPrivateKey = PrivateKey.generateED25519();
      const hcsDid = new HcsDid({
        identifier: hcsTopicId,
        privateKey: didPrivateKey,
        client
      });

      // Create DID document
      const didDocument = hcsDid.generateDidDocument({
        publicKey: didPrivateKey.publicKey
      });

      // Add pet-specific information to the DID document
      didDocument.service = [{
        id: `${didDocument.id}#pet-info`,
        type: 'PetIdentityService',
        serviceEndpoint: {
          microchipId: petData.microchipId || `CHIP-${Date.now()}`,
          species: 'Dog',
          breed: petData.breed,
          name: petData.name,
          age: petData.age,
          ownerAddress: owner,
          nftId: petId
        }
      }];

      // Register the DID on Hedera
      const didCreateTx = new HcsDidCreateDidDocumentTransaction()
        .setDidDocument(didDocument)
        .buildAndSignTransaction(didPrivateKey);

      await didCreateTx.execute(client);

      did = didDocument.id;
      document = didDocument;

      // Close client
      client.close();

      return NextResponse.json({
        success: true,
        did,
        topicId,
        document,
        mode: 'production',
        message: '✅ Real Hedera DID created successfully'
      });
    }

  } catch (error: any) {
    console.error('Error creating pet DID:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create pet DID'
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: Get Pet DID Information
 * GET /api/hedera/create-pet-did?did=did:hedera:testnet:...
 *
 * Mode-aware:
 * - Development: Returns mock DID document
 * - Production: Resolves real DID from Hedera
 */
export async function GET(request: NextRequest) {
  try {
    const config = getServerConfig();
    const { searchParams } = new URL(request.url);
    const did = searchParams.get('did');

    if (!did) {
      return NextResponse.json(
        { error: 'DID parameter is required' },
        { status: 400 }
      );
    }

    if (config.hedera.useMockDID) {
      // DEVELOPMENT MODE: Return mock data
      console.log('🔧 Development Mode: Returning mock DID document');

      return NextResponse.json({
        success: true,
        did: did,
        document: {
          '@context': 'https://www.w3.org/ns/did/v1',
          id: did,
          subject: {
            microchipId: `CHIP-${Date.now()}`,
            species: 'Dog',
            breed: 'Golden Retriever',
            name: 'Mock Pet',
            ownerAddress: '0x0000000000000000000000000000000000000000'
          }
        },
        mode: 'development',
        message: '🔧 Mock DID resolution for testing'
      });

    } else {
      // PRODUCTION MODE: Resolve real DID from Hedera
      console.log('🌐 Production Mode: Resolving real Hedera DID');

      if (!config.hedera.operatorId || !config.hedera.operatorKey) {
        return NextResponse.json(
          {
            error: 'Hedera credentials not configured'
          },
          { status: 500 }
        );
      }

      const { Client, PrivateKey } = await import('@hashgraph/sdk');
      const { HcsDid } = await import('@hashgraph/did-sdk-js');

      const client = Client.forTestnet();
      client.setOperator(
        config.hedera.operatorId,
        PrivateKey.fromString(config.hedera.operatorKey)
      );

      // Resolve the DID from Hedera
      const hcsDid = HcsDid.fromString(did);
      const didDocument = await hcsDid.resolve(client);

      client.close();

      return NextResponse.json({
        success: true,
        did,
        document: didDocument,
        mode: 'production',
        message: '✅ DID resolved from Hedera'
      });
    }

  } catch (error: any) {
    console.error('Error resolving pet DID:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to resolve DID'
      },
      { status: 500 }
    );
  }
}
