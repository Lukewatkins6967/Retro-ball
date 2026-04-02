using System.ComponentModel;

namespace UnityEngine.Networking
{
	[AddComponentMenu("Network/NetworkTransformVisualizer")]
	[DisallowMultipleComponent]
	[EditorBrowsable(EditorBrowsableState.Never)]
	[RequireComponent(typeof(NetworkTransform))]
	public class NetworkTransformVisualizer : NetworkBehaviour
	{
		[SerializeField]
		private GameObject m_VisualizerPrefab;

		private NetworkTransform m_NetworkTransform;

		private GameObject m_Visualizer;

		private static Material s_LineMaterial;

		public GameObject visualizerPrefab
		{
			get
			{
				return m_VisualizerPrefab;
			}
			set
			{
				m_VisualizerPrefab = value;
			}
		}

		public override void OnStartClient()
		{
			if (m_VisualizerPrefab != null)
			{
				m_NetworkTransform = GetComponent<NetworkTransform>();
				CreateLineMaterial();
				m_Visualizer = (GameObject)Object.Instantiate(m_VisualizerPrefab, base.transform.position, Quaternion.identity);
			}
		}

		public override void OnStartLocalPlayer()
		{
			if (!(m_Visualizer == null) && (m_NetworkTransform.localPlayerAuthority || base.isServer))
			{
				Object.Destroy(m_Visualizer);
			}
		}

		private void OnDestroy()
		{
			if (m_Visualizer != null)
			{
				Object.Destroy(m_Visualizer);
			}
		}

		[ClientCallback]
		private void FixedUpdate()
		{
			if (!(m_Visualizer == null) && (NetworkServer.active || NetworkClient.active) && (base.isServer || base.isClient) && (!base.hasAuthority || !m_NetworkTransform.localPlayerAuthority))
			{
				m_Visualizer.transform.position = m_NetworkTransform.targetSyncPosition;
				if (m_NetworkTransform.rigidbody3D != null && m_Visualizer.GetComponent<Rigidbody>() != null)
				{
					m_Visualizer.GetComponent<Rigidbody>().velocity = m_NetworkTransform.targetSyncVelocity;
				}
				if (m_NetworkTransform.rigidbody2D != null && m_Visualizer.GetComponent<Rigidbody2D>() != null)
				{
					m_Visualizer.GetComponent<Rigidbody2D>().velocity = m_NetworkTransform.targetSyncVelocity;
				}
				Quaternion rotation = Quaternion.identity;
				if (m_NetworkTransform.rigidbody3D != null)
				{
					rotation = m_NetworkTransform.targetSyncRotation3D;
				}
				if (m_NetworkTransform.rigidbody2D != null)
				{
					rotation = Quaternion.Euler(0f, 0f, m_NetworkTransform.targetSyncRotation2D);
				}
				m_Visualizer.transform.rotation = rotation;
			}
		}

		private void OnRenderObject()
		{
			if (!(m_Visualizer == null) && (!m_NetworkTransform.localPlayerAuthority || !base.hasAuthority) && m_NetworkTransform.lastSyncTime != 0f)
			{
				s_LineMaterial.SetPass(0);
				GL.Begin(1);
				GL.Color(Color.white);
				GL.Vertex3(base.transform.position.x, base.transform.position.y, base.transform.position.z);
				GL.Vertex3(m_NetworkTransform.targetSyncPosition.x, m_NetworkTransform.targetSyncPosition.y, m_NetworkTransform.targetSyncPosition.z);
				GL.End();
				DrawRotationInterpolation();
			}
		}

		private void DrawRotationInterpolation()
		{
			Quaternion quaternion = Quaternion.identity;
			if (m_NetworkTransform.rigidbody3D != null)
			{
				quaternion = m_NetworkTransform.targetSyncRotation3D;
			}
			if (m_NetworkTransform.rigidbody2D != null)
			{
				quaternion = Quaternion.Euler(0f, 0f, m_NetworkTransform.targetSyncRotation2D);
			}
			if (!(quaternion == Quaternion.identity))
			{
				GL.Begin(1);
				GL.Color(Color.yellow);
				GL.Vertex3(base.transform.position.x, base.transform.position.y, base.transform.position.z);
				Vector3 vector = base.transform.position + base.transform.right;
				GL.Vertex3(vector.x, vector.y, vector.z);
				GL.End();
				GL.Begin(1);
				GL.Color(Color.green);
				GL.Vertex3(base.transform.position.x, base.transform.position.y, base.transform.position.z);
				Vector3 vector2 = quaternion * Vector3.right;
				Vector3 vector3 = base.transform.position + vector2;
				GL.Vertex3(vector3.x, vector3.y, vector3.z);
				GL.End();
			}
		}

		private static void CreateLineMaterial()
		{
			if (!s_LineMaterial)
			{
				Shader shader = Shader.Find("Hidden/Internal-Colored");
				if (!shader)
				{
					Debug.LogWarning("Could not find Colored builtin shader");
					return;
				}
				s_LineMaterial = new Material(shader);
				s_LineMaterial.hideFlags = HideFlags.HideAndDontSave;
				s_LineMaterial.SetInt("_ZWrite", 0);
			}
		}
	}
}
