namespace UnityEngine.Networking.NetworkSystem
{
	internal class ObjectSpawnMessage : MessageBase
	{
		public NetworkInstanceId netId;

		public NetworkHash128 assetId;

		public Vector3 position;

		public byte[] payload;

		public override void Deserialize(NetworkReader reader)
		{
			netId = reader.ReadNetworkId();
			assetId = reader.ReadNetworkHash128();
			position = reader.ReadVector3();
			payload = reader.ReadBytesAndSize();
		}

		public override void Serialize(NetworkWriter writer)
		{
			writer.Write(netId);
			writer.Write(assetId);
			writer.Write(position);
			writer.WriteBytesFull(payload);
		}
	}
}
