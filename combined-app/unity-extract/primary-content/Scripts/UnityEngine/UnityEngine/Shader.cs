using System;
using System.Runtime.CompilerServices;
using UnityEngine.Rendering;

namespace UnityEngine
{
	public sealed class Shader : Object
	{
		public extern bool isSupported
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public static extern ShaderHardwareTier globalShaderHardwareTier
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern int maximumLOD
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public static extern int globalMaximumLOD
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			set;
		}

		public extern int renderQueue
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		internal extern DisableBatchingType disableBatching
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern Shader Find(string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		internal static extern Shader FindBuiltin(string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void EnableKeyword(string keyword);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void DisableKeyword(string keyword);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern bool IsKeywordEnabled(string keyword);

		public static void SetGlobalColor(string propertyName, Color color)
		{
			SetGlobalColor(PropertyToID(propertyName), color);
		}

		public static void SetGlobalColor(int nameID, Color color)
		{
			INTERNAL_CALL_SetGlobalColor(nameID, ref color);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetGlobalColor(int nameID, ref Color color);

		public static void SetGlobalVector(string propertyName, Vector4 vec)
		{
			SetGlobalColor(propertyName, vec);
		}

		public static void SetGlobalVector(int nameID, Vector4 vec)
		{
			SetGlobalColor(nameID, vec);
		}

		public static void SetGlobalFloat(string propertyName, float value)
		{
			SetGlobalFloat(PropertyToID(propertyName), value);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SetGlobalFloat(int nameID, float value);

		public static void SetGlobalInt(string propertyName, int value)
		{
			SetGlobalFloat(propertyName, value);
		}

		public static void SetGlobalInt(int nameID, int value)
		{
			SetGlobalFloat(nameID, value);
		}

		public static void SetGlobalTexture(string propertyName, Texture tex)
		{
			SetGlobalTexture(PropertyToID(propertyName), tex);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SetGlobalTexture(int nameID, Texture tex);

		public static void SetGlobalMatrix(string propertyName, Matrix4x4 mat)
		{
			SetGlobalMatrix(PropertyToID(propertyName), mat);
		}

		public static void SetGlobalMatrix(int nameID, Matrix4x4 mat)
		{
			INTERNAL_CALL_SetGlobalMatrix(nameID, ref mat);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void INTERNAL_CALL_SetGlobalMatrix(int nameID, ref Matrix4x4 mat);

		public static void SetGlobalFloatArray(string propertyName, float[] values)
		{
			SetGlobalFloatArray(PropertyToID(propertyName), values);
		}

		public static void SetGlobalFloatArray(int nameID, float[] values)
		{
			if (values == null)
			{
				throw new ArgumentNullException("values");
			}
			if (values.Length == 0)
			{
				throw new ArgumentException("Zero-sized array is not allowed.");
			}
			SetGlobalFloatArrayInternal(nameID, values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetGlobalFloatArrayInternal(int nameID, float[] values);

		public static void SetGlobalVectorArray(string propertyName, Vector4[] values)
		{
			SetGlobalVectorArray(PropertyToID(propertyName), values);
		}

		public static void SetGlobalVectorArray(int nameID, Vector4[] values)
		{
			if (values == null)
			{
				throw new ArgumentNullException("values");
			}
			if (values.Length == 0)
			{
				throw new ArgumentException("Zero-sized array is not allowed.");
			}
			SetGlobalVectorArrayInternal(nameID, values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetGlobalVectorArrayInternal(int nameID, Vector4[] values);

		public static void SetGlobalMatrixArray(string propertyName, Matrix4x4[] values)
		{
			SetGlobalMatrixArray(PropertyToID(propertyName), values);
		}

		public static void SetGlobalMatrixArray(int nameID, Matrix4x4[] values)
		{
			if (values == null)
			{
				throw new ArgumentNullException("values");
			}
			if (values.Length == 0)
			{
				throw new ArgumentException("Zero-sized array is not allowed.");
			}
			SetGlobalMatrixArrayInternal(nameID, values);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void SetGlobalMatrixArrayInternal(int nameID, Matrix4x4[] values);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		[Obsolete("SetGlobalTexGenMode is not supported anymore. Use programmable shaders to achieve the same effect.", true)]
		public static extern void SetGlobalTexGenMode(string propertyName, TexGenMode mode);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[Obsolete("SetGlobalTextureMatrixName is not supported anymore. Use programmable shaders to achieve the same effect.", true)]
		[WrapperlessIcall]
		public static extern void SetGlobalTextureMatrixName(string propertyName, string matrixName);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void SetGlobalBuffer(string propertyName, ComputeBuffer buffer);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern int PropertyToID(string name);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public static extern void WarmupAllShaders();
	}
}
