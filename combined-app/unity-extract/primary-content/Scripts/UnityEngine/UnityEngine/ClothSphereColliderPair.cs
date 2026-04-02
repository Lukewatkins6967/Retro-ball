using UnityEngine.Scripting;

namespace UnityEngine
{
	[UsedByNativeCode]
	public struct ClothSphereColliderPair
	{
		private SphereCollider m_First;

		private SphereCollider m_Second;

		public SphereCollider first
		{
			get
			{
				return m_First;
			}
			set
			{
				m_First = value;
			}
		}

		public SphereCollider second
		{
			get
			{
				return m_Second;
			}
			set
			{
				m_Second = value;
			}
		}

		public ClothSphereColliderPair(SphereCollider a)
		{
			m_First = null;
			m_Second = null;
			first = a;
			second = null;
		}

		public ClothSphereColliderPair(SphereCollider a, SphereCollider b)
		{
			m_First = null;
			m_Second = null;
			first = a;
			second = b;
		}
	}
}
