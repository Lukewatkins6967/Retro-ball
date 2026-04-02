using System.Runtime.CompilerServices;

namespace UnityEngine.Rendering
{
	public sealed class GraphicsSettings : Object
	{
		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SetShaderMode(BuiltinShaderType type, BuiltinShaderMode mode);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern BuiltinShaderMode GetShaderMode(BuiltinShaderType type);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SetCustomShader(BuiltinShaderType type, Shader shader);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern Shader GetCustomShader(BuiltinShaderType type);
	}
}
