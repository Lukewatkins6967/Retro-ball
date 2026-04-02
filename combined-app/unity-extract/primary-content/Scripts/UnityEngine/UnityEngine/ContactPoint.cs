using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine
{
	[UsedByNativeCode]
	public struct ContactPoint
	{
		internal Vector3 m_Point;

		internal Vector3 m_Normal;

		internal int m_ThisColliderInstanceID;

		internal int m_OtherColliderInstanceID;

		internal float m_Separation;

		public Vector3 point
		{
			get
			{
				return m_Point;
			}
		}

		public Vector3 normal
		{
			get
			{
				return m_Normal;
			}
		}

		public Collider thisCollider
		{
			get
			{
				return ColliderFromInstanceId(m_ThisColliderInstanceID);
			}
		}

		public Collider otherCollider
		{
			get
			{
				return ColliderFromInstanceId(m_OtherColliderInstanceID);
			}
		}

		public float separation
		{
			get
			{
				return m_Separation;
			}
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern Collider ColliderFromInstanceId(int instanceID);
	}
}
