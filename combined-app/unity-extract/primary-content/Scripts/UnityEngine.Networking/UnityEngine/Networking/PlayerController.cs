namespace UnityEngine.Networking
{
	public class PlayerController
	{
		internal const short kMaxLocalPlayers = 8;

		public const int MaxPlayersPerClient = 32;

		public short playerControllerId = -1;

		public NetworkIdentity unetView;

		public GameObject gameObject;

		public bool IsValid
		{
			get
			{
				return playerControllerId != -1;
			}
		}

		public PlayerController()
		{
		}

		internal PlayerController(GameObject go, short playerControllerId)
		{
			gameObject = go;
			unetView = go.GetComponent<NetworkIdentity>();
			this.playerControllerId = playerControllerId;
		}

		public override string ToString()
		{
			return string.Format("ID={0} NetworkIdentity NetID={1} Player={2}", new object[3]
			{
				playerControllerId,
				(!(unetView != null)) ? "null" : unetView.netId.ToString(),
				(!(gameObject != null)) ? "null" : gameObject.name
			});
		}
	}
}
