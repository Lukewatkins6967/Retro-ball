using System;
using System.Runtime.CompilerServices;
using UnityEngine.Scripting;

namespace UnityEngine
{
	[RequiredByNativeCode(Optional = true)]
	public struct ParticleCollisionEvent
	{
		private Vector3 m_Intersection;

		private Vector3 m_Normal;

		private Vector3 m_Velocity;

		private int m_ColliderInstanceID;

		public Vector3 intersection
		{
			get
			{
				return m_Intersection;
			}
		}

		public Vector3 normal
		{
			get
			{
				return m_Normal;
			}
		}

		public Vector3 velocity
		{
			get
			{
				return m_Velocity;
			}
		}

		[Obsolete("collider property is deprecated. Use colliderComponent instead, which supports Collider and Collider2D components.")]
		public Collider collider
		{
			get
			{
				return InstanceIDToCollider(m_ColliderInstanceID);
			}
		}

		public Component colliderComponent
		{
			get
			{
				return InstanceIDToColliderComponent(m_ColliderInstanceID);
			}
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern Collider InstanceIDToCollider(int instanceID);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern Component InstanceIDToColliderComponent(int instanceID);
	}
}
