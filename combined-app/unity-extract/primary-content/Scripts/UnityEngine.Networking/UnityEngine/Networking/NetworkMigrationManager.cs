using System.Collections.Generic;
using UnityEngine.Networking.Match;
using UnityEngine.Networking.NetworkSystem;
using UnityEngine.Networking.Types;

namespace UnityEngine.Networking
{
	[AddComponentMenu("Network/NetworkMigrationManager")]
	public class NetworkMigrationManager : MonoBehaviour
	{
		public enum SceneChangeOption
		{
			StayInOnlineScene = 0,
			SwitchToOfflineScene = 1
		}

		public struct PendingPlayerInfo
		{
			public NetworkInstanceId netId;

			public short playerControllerId;

			public GameObject obj;
		}

		public struct ConnectionPendingPlayers
		{
			public List<PendingPlayerInfo> players;
		}

		[SerializeField]
		private bool m_HostMigration = true;

		[SerializeField]
		private bool m_ShowGUI = true;

		[SerializeField]
		private int m_OffsetX = 10;

		[SerializeField]
		private int m_OffsetY = 300;

		private NetworkClient m_Client;

		private bool m_WaitingToBecomeNewHost;

		private bool m_WaitingReconnectToNewHost;

		private bool m_DisconnectedFromHost;

		private bool m_HostWasShutdown;

		private MatchInfo m_MatchInfo;

		private int m_OldServerConnectionId = -1;

		private string m_NewHostAddress;

		private PeerInfoMessage m_NewHostInfo = new PeerInfoMessage();

		private PeerListMessage m_PeerListMessage = new PeerListMessage();

		private PeerInfoMessage[] m_Peers;

		private Dictionary<int, ConnectionPendingPlayers> m_PendingPlayers = new Dictionary<int, ConnectionPendingPlayers>();

		public bool hostMigration
		{
			get
			{
				return m_HostMigration;
			}
			set
			{
				m_HostMigration = value;
			}
		}

		public bool showGUI
		{
			get
			{
				return m_ShowGUI;
			}
			set
			{
				m_ShowGUI = value;
			}
		}

		public int offsetX
		{
			get
			{
				return m_OffsetX;
			}
			set
			{
				m_OffsetX = value;
			}
		}

		public int offsetY
		{
			get
			{
				return m_OffsetY;
			}
			set
			{
				m_OffsetY = value;
			}
		}

		public NetworkClient client
		{
			get
			{
				return m_Client;
			}
		}

		public bool waitingToBecomeNewHost
		{
			get
			{
				return m_WaitingToBecomeNewHost;
			}
			set
			{
				m_WaitingToBecomeNewHost = value;
			}
		}

		public bool waitingReconnectToNewHost
		{
			get
			{
				return m_WaitingReconnectToNewHost;
			}
			set
			{
				m_WaitingReconnectToNewHost = value;
			}
		}

		public bool disconnectedFromHost
		{
			get
			{
				return m_DisconnectedFromHost;
			}
		}

		public bool hostWasShutdown
		{
			get
			{
				return m_HostWasShutdown;
			}
		}

		public MatchInfo matchInfo
		{
			get
			{
				return m_MatchInfo;
			}
		}

		public int oldServerConnectionId
		{
			get
			{
				return m_OldServerConnectionId;
			}
		}

		public string newHostAddress
		{
			get
			{
				return m_NewHostAddress;
			}
			set
			{
				m_NewHostAddress = value;
			}
		}

		public PeerInfoMessage[] peers
		{
			get
			{
				return m_Peers;
			}
		}

		public Dictionary<int, ConnectionPendingPlayers> pendingPlayers
		{
			get
			{
				return m_PendingPlayers;
			}
		}

		private void AddPendingPlayer(GameObject obj, int connectionId, NetworkInstanceId netId, short playerControllerId)
		{
			if (!m_PendingPlayers.ContainsKey(connectionId))
			{
				ConnectionPendingPlayers value = new ConnectionPendingPlayers
				{
					players = new List<PendingPlayerInfo>()
				};
				m_PendingPlayers[connectionId] = value;
			}
			PendingPlayerInfo item = new PendingPlayerInfo
			{
				netId = netId,
				playerControllerId = playerControllerId,
				obj = obj
			};
			m_PendingPlayers[connectionId].players.Add(item);
		}

		private GameObject FindPendingPlayer(int connectionId, NetworkInstanceId netId, short playerControllerId)
		{
			if (m_PendingPlayers.ContainsKey(connectionId))
			{
				for (int i = 0; i < m_PendingPlayers[connectionId].players.Count; i++)
				{
					PendingPlayerInfo pendingPlayerInfo = m_PendingPlayers[connectionId].players[i];
					if (pendingPlayerInfo.netId == netId && pendingPlayerInfo.playerControllerId == playerControllerId)
					{
						return pendingPlayerInfo.obj;
					}
				}
			}
			return null;
		}

		private void RemovePendingPlayer(int connectionId)
		{
			m_PendingPlayers.Remove(connectionId);
		}

		private void Start()
		{
			Reset(-1);
		}

		public void Reset(int reconnectId)
		{
			m_OldServerConnectionId = -1;
			m_WaitingToBecomeNewHost = false;
			m_WaitingReconnectToNewHost = false;
			m_DisconnectedFromHost = false;
			m_HostWasShutdown = false;
			ClientScene.SetReconnectId(reconnectId, m_Peers);
			if (NetworkManager.singleton != null)
			{
				NetworkManager.singleton.SetupMigrationManager(this);
			}
		}

		internal void AssignAuthorityCallback(NetworkConnection conn, NetworkIdentity uv, bool authorityState)
		{
			PeerAuthorityMessage peerAuthorityMessage = new PeerAuthorityMessage();
			peerAuthorityMessage.connectionId = conn.connectionId;
			peerAuthorityMessage.netId = uv.netId;
			peerAuthorityMessage.authorityState = authorityState;
			if (LogFilter.logDebug)
			{
				Debug.Log("AssignAuthorityCallback send for netId" + uv.netId);
			}
			for (int i = 0; i < NetworkServer.connections.Count; i++)
			{
				NetworkConnection networkConnection = NetworkServer.connections[i];
				if (networkConnection != null)
				{
					networkConnection.Send(18, peerAuthorityMessage);
				}
			}
		}

		public void Initialize(NetworkClient newClient, MatchInfo newMatchInfo)
		{
			if (LogFilter.logDev)
			{
				Debug.Log("NetworkMigrationManager initialize");
			}
			m_Client = newClient;
			m_MatchInfo = newMatchInfo;
			newClient.RegisterHandlerSafe(11, OnPeerInfo);
			newClient.RegisterHandlerSafe(18, OnPeerClientAuthority);
			NetworkIdentity.clientAuthorityCallback = AssignAuthorityCallback;
		}

		public void DisablePlayerObjects()
		{
			if (LogFilter.logDev)
			{
				Debug.Log("NetworkMigrationManager DisablePlayerObjects");
			}
			if (m_Peers == null)
			{
				return;
			}
			for (int i = 0; i < m_Peers.Length; i++)
			{
				PeerInfoMessage peerInfoMessage = m_Peers[i];
				if (peerInfoMessage.playerIds == null)
				{
					continue;
				}
				for (int j = 0; j < peerInfoMessage.playerIds.Length; j++)
				{
					PeerInfoPlayer peerInfoPlayer = peerInfoMessage.playerIds[j];
					if (LogFilter.logDev)
					{
						Debug.Log(string.Concat("DisablePlayerObjects disable player for ", peerInfoMessage.address, " netId:", peerInfoPlayer.netId, " control:", peerInfoPlayer.playerControllerId));
					}
					GameObject gameObject = ClientScene.FindLocalObject(peerInfoPlayer.netId);
					if (gameObject != null)
					{
						gameObject.SetActive(false);
						AddPendingPlayer(gameObject, peerInfoMessage.connectionId, peerInfoPlayer.netId, peerInfoPlayer.playerControllerId);
					}
					else if (LogFilter.logWarn)
					{
						Debug.LogWarning("DisablePlayerObjects didnt find player Conn:" + peerInfoMessage.connectionId + " NetId:" + peerInfoPlayer.netId);
					}
				}
			}
		}

		public void SendPeerInfo()
		{
			if (!m_HostMigration)
			{
				return;
			}
			PeerListMessage peerListMessage = new PeerListMessage();
			List<PeerInfoMessage> list = new List<PeerInfoMessage>();
			PeerInfoPlayer item = default(PeerInfoPlayer);
			PeerInfoPlayer item2 = default(PeerInfoPlayer);
			for (int i = 0; i < NetworkServer.connections.Count; i++)
			{
				NetworkConnection networkConnection = NetworkServer.connections[i];
				if (networkConnection == null)
				{
					continue;
				}
				PeerInfoMessage peerInfoMessage = new PeerInfoMessage();
				string address;
				int port;
				NetworkID network;
				NodeID dstNode;
				byte error;
				NetworkTransport.GetConnectionInfo(NetworkServer.serverHostId, networkConnection.connectionId, out address, out port, out network, out dstNode, out error);
				peerInfoMessage.connectionId = networkConnection.connectionId;
				peerInfoMessage.port = port;
				if (i == 0)
				{
					peerInfoMessage.port = NetworkServer.listenPort;
					peerInfoMessage.isHost = true;
					peerInfoMessage.address = "<host>";
				}
				else
				{
					peerInfoMessage.address = address;
					peerInfoMessage.isHost = false;
				}
				List<PeerInfoPlayer> list2 = new List<PeerInfoPlayer>();
				for (int j = 0; j < networkConnection.playerControllers.Count; j++)
				{
					PlayerController playerController = networkConnection.playerControllers[j];
					if (playerController != null && playerController.unetView != null)
					{
						item.netId = playerController.unetView.netId;
						item.playerControllerId = playerController.unetView.playerControllerId;
						list2.Add(item);
					}
				}
				if (networkConnection.clientOwnedObjects != null)
				{
					foreach (NetworkInstanceId clientOwnedObject in networkConnection.clientOwnedObjects)
					{
						GameObject gameObject = NetworkServer.FindLocalObject(clientOwnedObject);
						if (!(gameObject == null))
						{
							NetworkIdentity component = gameObject.GetComponent<NetworkIdentity>();
							if (component.playerControllerId == -1)
							{
								item2.netId = clientOwnedObject;
								item2.playerControllerId = -1;
								list2.Add(item2);
							}
						}
					}
				}
				if (list2.Count > 0)
				{
					peerInfoMessage.playerIds = list2.ToArray();
				}
				list.Add(peerInfoMessage);
			}
			peerListMessage.peers = list.ToArray();
			for (int k = 0; k < NetworkServer.connections.Count; k++)
			{
				NetworkConnection networkConnection2 = NetworkServer.connections[k];
				if (networkConnection2 != null)
				{
					peerListMessage.oldServerConnectionId = networkConnection2.connectionId;
					networkConnection2.Send(11, peerListMessage);
				}
			}
		}

		private void OnPeerClientAuthority(NetworkMessage netMsg)
		{
			PeerAuthorityMessage peerAuthorityMessage = netMsg.ReadMessage<PeerAuthorityMessage>();
			if (LogFilter.logDebug)
			{
				Debug.Log("OnPeerClientAuthority for netId:" + peerAuthorityMessage.netId);
			}
			if (m_Peers == null)
			{
				return;
			}
			for (int i = 0; i < m_Peers.Length; i++)
			{
				PeerInfoMessage peerInfoMessage = m_Peers[i];
				if (peerInfoMessage.connectionId != peerAuthorityMessage.connectionId)
				{
					continue;
				}
				if (peerInfoMessage.playerIds == null)
				{
					peerInfoMessage.playerIds = new PeerInfoPlayer[0];
				}
				if (peerAuthorityMessage.authorityState)
				{
					for (int j = 0; j < peerInfoMessage.playerIds.Length; j++)
					{
						if (peerInfoMessage.playerIds[j].netId == peerAuthorityMessage.netId)
						{
							return;
						}
					}
					PeerInfoPlayer item = new PeerInfoPlayer
					{
						netId = peerAuthorityMessage.netId,
						playerControllerId = -1
					};
					List<PeerInfoPlayer> list = new List<PeerInfoPlayer>(peerInfoMessage.playerIds);
					list.Add(item);
					peerInfoMessage.playerIds = list.ToArray();
					continue;
				}
				for (int k = 0; k < peerInfoMessage.playerIds.Length; k++)
				{
					if (peerInfoMessage.playerIds[k].netId == peerAuthorityMessage.netId)
					{
						List<PeerInfoPlayer> list2 = new List<PeerInfoPlayer>(peerInfoMessage.playerIds);
						list2.RemoveAt(k);
						peerInfoMessage.playerIds = list2.ToArray();
						break;
					}
				}
			}
			GameObject go = ClientScene.FindLocalObject(peerAuthorityMessage.netId);
			OnAuthorityUpdated(go, peerAuthorityMessage.connectionId, peerAuthorityMessage.authorityState);
		}

		private void OnPeerInfo(NetworkMessage netMsg)
		{
			if (LogFilter.logDebug)
			{
				Debug.Log("OnPeerInfo");
			}
			netMsg.ReadMessage(m_PeerListMessage);
			m_Peers = m_PeerListMessage.peers;
			m_OldServerConnectionId = m_PeerListMessage.oldServerConnectionId;
			for (int i = 0; i < m_Peers.Length; i++)
			{
				if (LogFilter.logDebug)
				{
					Debug.Log("peer conn " + m_Peers[i].connectionId + " your conn " + m_PeerListMessage.oldServerConnectionId);
				}
				if (m_Peers[i].connectionId == m_PeerListMessage.oldServerConnectionId)
				{
					m_Peers[i].isYou = true;
					break;
				}
			}
			OnPeersUpdated(m_PeerListMessage);
		}

		private void OnServerReconnectPlayerMessage(NetworkMessage netMsg)
		{
			ReconnectMessage reconnectMessage = netMsg.ReadMessage<ReconnectMessage>();
			if (LogFilter.logDev)
			{
				Debug.Log("OnReconnectMessage: connId=" + reconnectMessage.oldConnectionId + " playerControllerId:" + reconnectMessage.playerControllerId + " netId:" + reconnectMessage.netId);
			}
			GameObject gameObject = FindPendingPlayer(reconnectMessage.oldConnectionId, reconnectMessage.netId, reconnectMessage.playerControllerId);
			if (gameObject == null)
			{
				if (LogFilter.logError)
				{
					Debug.LogError(string.Concat("OnReconnectMessage connId=", reconnectMessage.oldConnectionId, " player null for netId:", reconnectMessage.netId, " msg.playerControllerId:", reconnectMessage.playerControllerId));
				}
				return;
			}
			if (gameObject.activeSelf)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("OnReconnectMessage connId=" + reconnectMessage.oldConnectionId + " player already active?");
				}
				return;
			}
			if (LogFilter.logDebug)
			{
				Debug.Log("OnReconnectMessage: player=" + gameObject);
			}
			NetworkReader networkReader = null;
			if (reconnectMessage.msgSize != 0)
			{
				networkReader = new NetworkReader(reconnectMessage.msgData);
			}
			if (reconnectMessage.playerControllerId != -1)
			{
				if (networkReader == null)
				{
					OnServerReconnectPlayer(netMsg.conn, gameObject, reconnectMessage.oldConnectionId, reconnectMessage.playerControllerId);
				}
				else
				{
					OnServerReconnectPlayer(netMsg.conn, gameObject, reconnectMessage.oldConnectionId, reconnectMessage.playerControllerId, networkReader);
				}
			}
			else
			{
				OnServerReconnectObject(netMsg.conn, gameObject, reconnectMessage.oldConnectionId);
			}
		}

		public bool ReconnectObjectForConnection(NetworkConnection newConnection, GameObject oldObject, int oldConnectionId)
		{
			if (!NetworkServer.active)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectObjectForConnection must have active server");
				}
				return false;
			}
			if (LogFilter.logDebug)
			{
				Debug.Log(string.Concat("ReconnectObjectForConnection: oldConnId=", oldConnectionId, " obj=", oldObject, " conn:", newConnection));
			}
			if (!m_PendingPlayers.ContainsKey(oldConnectionId))
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectObjectForConnection oldConnId=" + oldConnectionId + " not found.");
				}
				return false;
			}
			oldObject.SetActive(true);
			oldObject.GetComponent<NetworkIdentity>().SetNetworkInstanceId(new NetworkInstanceId(0u));
			if (!NetworkServer.SpawnWithClientAuthority(oldObject, newConnection))
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectObjectForConnection oldConnId=" + oldConnectionId + " SpawnWithClientAuthority failed.");
				}
				return false;
			}
			return true;
		}

		public bool ReconnectPlayerForConnection(NetworkConnection newConnection, GameObject oldPlayer, int oldConnectionId, short playerControllerId)
		{
			if (!NetworkServer.active)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectPlayerForConnection must have active server");
				}
				return false;
			}
			if (LogFilter.logDebug)
			{
				Debug.Log(string.Concat("ReconnectPlayerForConnection: oldConnId=", oldConnectionId, " player=", oldPlayer, " conn:", newConnection));
			}
			if (!m_PendingPlayers.ContainsKey(oldConnectionId))
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectPlayerForConnection oldConnId=" + oldConnectionId + " not found.");
				}
				return false;
			}
			oldPlayer.SetActive(true);
			NetworkServer.Spawn(oldPlayer);
			if (!NetworkServer.AddPlayerForConnection(newConnection, oldPlayer, playerControllerId))
			{
				if (LogFilter.logError)
				{
					Debug.LogError("ReconnectPlayerForConnection oldConnId=" + oldConnectionId + " AddPlayerForConnection failed.");
				}
				return false;
			}
			if (NetworkServer.localClientActive)
			{
				SendPeerInfo();
			}
			return true;
		}

		public bool LostHostOnClient(NetworkConnection conn)
		{
			if (LogFilter.logDebug)
			{
				Debug.Log("NetworkMigrationManager client OnDisconnectedFromHost");
			}
			if (Application.platform == RuntimePlatform.WebGLPlayer)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("LostHostOnClient: Host migration not supported on WebGL");
				}
				return false;
			}
			if (m_Client == null)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("NetworkMigrationManager LostHostOnHost client was never initialized.");
				}
				return false;
			}
			if (!m_HostMigration)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("NetworkMigrationManager LostHostOnHost migration not enabled.");
				}
				return false;
			}
			m_DisconnectedFromHost = true;
			DisablePlayerObjects();
			byte error;
			NetworkTransport.Disconnect(m_Client.hostId, m_Client.connection.connectionId, out error);
			if (m_OldServerConnectionId != -1)
			{
				SceneChangeOption sceneChange;
				OnClientDisconnectedFromHost(conn, out sceneChange);
				return sceneChange == SceneChangeOption.StayInOnlineScene;
			}
			return false;
		}

		public void LostHostOnHost()
		{
			if (LogFilter.logDebug)
			{
				Debug.Log("NetworkMigrationManager LostHostOnHost");
			}
			if (Application.platform == RuntimePlatform.WebGLPlayer)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("LostHostOnHost: Host migration not supported on WebGL");
				}
				return;
			}
			OnServerHostShutdown();
			if (m_Peers == null)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("NetworkMigrationManager LostHostOnHost no peers");
				}
			}
			else if (m_Peers.Length != 1)
			{
				m_HostWasShutdown = true;
			}
		}

		public bool BecomeNewHost(int port)
		{
			if (LogFilter.logDebug)
			{
				Debug.Log("NetworkMigrationManager BecomeNewHost " + m_MatchInfo);
			}
			NetworkServer.RegisterHandler(47, OnServerReconnectPlayerMessage);
			NetworkClient networkClient = NetworkServer.BecomeHost(m_Client, port, m_MatchInfo, oldServerConnectionId, peers);
			if (networkClient != null)
			{
				if (NetworkManager.singleton != null)
				{
					NetworkManager.singleton.RegisterServerMessages();
					NetworkManager.singleton.UseExternalClient(networkClient);
				}
				else
				{
					Debug.LogWarning("MigrationManager BecomeNewHost - No NetworkManager.");
				}
				networkClient.RegisterHandlerSafe(11, OnPeerInfo);
				RemovePendingPlayer(m_OldServerConnectionId);
				Reset(-1);
				SendPeerInfo();
				return true;
			}
			if (LogFilter.logError)
			{
				Debug.LogError("NetworkServer.BecomeHost failed");
			}
			return false;
		}

		protected virtual void OnClientDisconnectedFromHost(NetworkConnection conn, out SceneChangeOption sceneChange)
		{
			sceneChange = SceneChangeOption.StayInOnlineScene;
		}

		protected virtual void OnServerHostShutdown()
		{
		}

		protected virtual void OnServerReconnectPlayer(NetworkConnection newConnection, GameObject oldPlayer, int oldConnectionId, short playerControllerId)
		{
			ReconnectPlayerForConnection(newConnection, oldPlayer, oldConnectionId, playerControllerId);
		}

		protected virtual void OnServerReconnectPlayer(NetworkConnection newConnection, GameObject oldPlayer, int oldConnectionId, short playerControllerId, NetworkReader extraMessageReader)
		{
			ReconnectPlayerForConnection(newConnection, oldPlayer, oldConnectionId, playerControllerId);
		}

		protected virtual void OnServerReconnectObject(NetworkConnection newConnection, GameObject oldObject, int oldConnectionId)
		{
			ReconnectObjectForConnection(newConnection, oldObject, oldConnectionId);
		}

		protected virtual void OnPeersUpdated(PeerListMessage peers)
		{
			if (LogFilter.logDev)
			{
				Debug.Log("NetworkMigrationManager NumPeers " + peers.peers.Length);
			}
		}

		protected virtual void OnAuthorityUpdated(GameObject go, int connectionId, bool authorityState)
		{
			if (LogFilter.logDev)
			{
				Debug.Log(string.Concat("NetworkMigrationManager OnAuthorityUpdated for ", go, " conn:", connectionId, " state:", authorityState));
			}
		}

		public virtual bool FindNewHost(out PeerInfoMessage newHostInfo, out bool youAreNewHost)
		{
			if (m_Peers == null)
			{
				if (LogFilter.logError)
				{
					Debug.LogError("NetworkMigrationManager FindLowestHost no peers");
				}
				newHostInfo = null;
				youAreNewHost = false;
				return false;
			}
			if (LogFilter.logDev)
			{
				Debug.Log("NetworkMigrationManager FindLowestHost");
			}
			newHostInfo = new PeerInfoMessage();
			newHostInfo.connectionId = 50000;
			newHostInfo.address = string.Empty;
			newHostInfo.port = 0;
			int num = -1;
			youAreNewHost = false;
			if (m_Peers == null)
			{
				return false;
			}
			for (int i = 0; i < m_Peers.Length; i++)
			{
				PeerInfoMessage peerInfoMessage = m_Peers[i];
				if (peerInfoMessage.connectionId != 0 && !peerInfoMessage.isHost)
				{
					if (peerInfoMessage.isYou)
					{
						num = peerInfoMessage.connectionId;
					}
					if (peerInfoMessage.connectionId < newHostInfo.connectionId)
					{
						newHostInfo = peerInfoMessage;
					}
				}
			}
			if (newHostInfo.connectionId == 50000)
			{
				return false;
			}
			if (newHostInfo.connectionId == num)
			{
				youAreNewHost = true;
			}
			if (LogFilter.logDev)
			{
				Debug.Log("FindNewHost new host is " + newHostInfo.address);
			}
			return true;
		}

		private void OnGUIHost()
		{
			int num = m_OffsetY;
			GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "Host Was Shutdown ID(" + m_OldServerConnectionId + ")");
			num += 25;
			if (Application.platform == RuntimePlatform.WebGLPlayer)
			{
				GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "Host Migration not supported for WebGL");
				return;
			}
			if (m_WaitingReconnectToNewHost)
			{
				if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Reconnect as Client"))
				{
					Reset(0);
					if (NetworkManager.singleton != null)
					{
						NetworkManager.singleton.networkAddress = GUI.TextField(new Rect(m_OffsetX + 100, num, 95f, 20f), NetworkManager.singleton.networkAddress);
						NetworkManager.singleton.StartClient();
					}
					else
					{
						Debug.LogWarning("MigrationManager Old Host Reconnect - No NetworkManager.");
					}
				}
				num += 25;
			}
			else
			{
				bool youAreNewHost;
				if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Pick New Host") && FindNewHost(out m_NewHostInfo, out youAreNewHost))
				{
					m_NewHostAddress = m_NewHostInfo.address;
					if (youAreNewHost)
					{
						Debug.LogWarning("MigrationManager FindNewHost - new host is self?");
					}
					else
					{
						m_WaitingReconnectToNewHost = true;
					}
				}
				num += 25;
			}
			if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Leave Game"))
			{
				if (NetworkManager.singleton != null)
				{
					NetworkManager.singleton.SetupMigrationManager(null);
					NetworkManager.singleton.StopHost();
				}
				else
				{
					Debug.LogWarning("MigrationManager Old Host LeaveGame - No NetworkManager.");
				}
				Reset(-1);
			}
			num += 25;
		}

		private void OnGUIClient()
		{
			int num = m_OffsetY;
			GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "Lost Connection To Host ID(" + m_OldServerConnectionId + ")");
			num += 25;
			if (Application.platform == RuntimePlatform.WebGLPlayer)
			{
				GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "Host Migration not supported for WebGL");
				return;
			}
			if (m_WaitingToBecomeNewHost)
			{
				GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "You are the new host");
				num += 25;
				if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Start As Host"))
				{
					if (NetworkManager.singleton != null)
					{
						BecomeNewHost(NetworkManager.singleton.networkPort);
					}
					else
					{
						Debug.LogWarning("MigrationManager Client BecomeNewHost - No NetworkManager.");
					}
				}
				num += 25;
			}
			else if (m_WaitingReconnectToNewHost)
			{
				GUI.Label(new Rect(m_OffsetX, num, 200f, 40f), "New host is " + m_NewHostAddress);
				num += 25;
				if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Reconnect To New Host"))
				{
					Reset(m_OldServerConnectionId);
					if (NetworkManager.singleton != null)
					{
						NetworkManager.singleton.networkAddress = m_NewHostAddress;
						NetworkManager.singleton.client.ReconnectToNewHost(m_NewHostAddress, NetworkManager.singleton.networkPort);
					}
					else
					{
						Debug.LogWarning("MigrationManager Client reconnect - No NetworkManager.");
					}
				}
				num += 25;
			}
			else
			{
				bool youAreNewHost;
				if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Pick New Host") && FindNewHost(out m_NewHostInfo, out youAreNewHost))
				{
					m_NewHostAddress = m_NewHostInfo.address;
					if (youAreNewHost)
					{
						m_WaitingToBecomeNewHost = true;
					}
					else
					{
						m_WaitingReconnectToNewHost = true;
					}
				}
				num += 25;
			}
			if (GUI.Button(new Rect(m_OffsetX, num, 200f, 20f), "Leave Game"))
			{
				if (NetworkManager.singleton != null)
				{
					NetworkManager.singleton.SetupMigrationManager(null);
					NetworkManager.singleton.StopHost();
				}
				else
				{
					Debug.LogWarning("MigrationManager Client LeaveGame - No NetworkManager.");
				}
				Reset(-1);
			}
			num += 25;
		}

		private void OnGUI()
		{
			if (m_ShowGUI)
			{
				if (m_HostWasShutdown)
				{
					OnGUIHost();
				}
				else if (m_DisconnectedFromHost && m_OldServerConnectionId != -1)
				{
					OnGUIClient();
				}
			}
		}
	}
}
