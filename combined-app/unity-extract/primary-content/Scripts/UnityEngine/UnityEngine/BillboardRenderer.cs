using System.Runtime.CompilerServices;

namespace UnityEngine
{
	public sealed class BillboardRenderer : Renderer
	{
		public extern BillboardAsset billboard
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
