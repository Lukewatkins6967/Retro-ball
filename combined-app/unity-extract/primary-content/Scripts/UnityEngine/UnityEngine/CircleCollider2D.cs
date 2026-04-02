using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public sealed class CircleCollider2D : Collider2D
	{
		public extern float radius
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}
	}
}
