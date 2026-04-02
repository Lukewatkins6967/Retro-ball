using UnityEngine;

namespace PowerTools
{
	public class SpriteAnimNodes : MonoBehaviour
	{
		public static readonly int NUM_NODES = 10;

		[SerializeField]
		[HideInInspector]
		private Vector2 m_node0 = Vector2.zero;

		[HideInInspector]
		[SerializeField]
		private Vector2 m_node1 = Vector2.zero;

		[HideInInspector]
		[SerializeField]
		private Vector2 m_node2 = Vector2.zero;

		[HideInInspector]
		[SerializeField]
		private Vector2 m_node3 = Vector2.zero;

		[SerializeField]
		[HideInInspector]
		private Vector2 m_node4 = Vector2.zero;

		[SerializeField]
		[HideInInspector]
		private Vector2 m_node5 = Vector2.zero;

		[SerializeField]
		[HideInInspector]
		private Vector2 m_node6 = Vector2.zero;

		[HideInInspector]
		[SerializeField]
		private Vector2 m_node7 = Vector2.zero;

		[HideInInspector]
		[SerializeField]
		private Vector2 m_node8 = Vector2.zero;

		[SerializeField]
		[HideInInspector]
		private Vector2 m_node9 = Vector2.zero;

		private SpriteRenderer m_spriteRenderer;

		public Vector2 Node0
		{
			get
			{
				return m_node0;
			}
		}

		public Vector2 Node1
		{
			get
			{
				return m_node1;
			}
		}

		public Vector2 Node2
		{
			get
			{
				return m_node2;
			}
		}

		public Vector2 Node3
		{
			get
			{
				return m_node3;
			}
		}

		public Vector2 Node4
		{
			get
			{
				return m_node4;
			}
		}

		public Vector2 Node5
		{
			get
			{
				return m_node5;
			}
		}

		public Vector2 Node6
		{
			get
			{
				return m_node6;
			}
		}

		public Vector2 Node7
		{
			get
			{
				return m_node7;
			}
		}

		public Vector2 Node8
		{
			get
			{
				return m_node8;
			}
		}

		public Vector2 Node9
		{
			get
			{
				return m_node9;
			}
		}

		public Vector3 GetNode(int nodeId)
		{
			if (m_spriteRenderer == null)
			{
				m_spriteRenderer = GetComponent<SpriteRenderer>();
			}
			Vector3 vector = GetNodeRaw(nodeId);
			vector.y = 0f - vector.y;
			vector *= 1f / m_spriteRenderer.sprite.pixelsPerUnit;
			vector = base.transform.rotation * vector;
			vector.Scale(base.transform.localScale);
			return vector + base.transform.position;
		}

		public Vector2 GetNodeRaw(int nodeId)
		{
			switch (nodeId)
			{
			case 0:
				return m_node0;
			case 1:
				return m_node1;
			case 2:
				return m_node2;
			case 3:
				return m_node3;
			case 4:
				return m_node4;
			case 5:
				return m_node5;
			case 6:
				return m_node6;
			case 7:
				return m_node7;
			case 8:
				return m_node8;
			case 9:
				return m_node9;
			default:
				return Vector2.zero;
			}
		}
	}
}
