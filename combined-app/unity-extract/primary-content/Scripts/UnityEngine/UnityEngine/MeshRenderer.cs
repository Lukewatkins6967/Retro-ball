using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public sealed class MeshRenderer : Renderer
	{
		public extern Mesh additionalVertexStreams
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
