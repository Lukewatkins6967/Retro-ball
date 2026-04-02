using System.Runtime.CompilerServices;
using UnityEngine.Rendering;

namespace UnityEngine
{
	public sealed class ShaderVariantCollection : Object
	{
		public struct ShaderVariant
		{
			public Shader shader;

			public PassType passType;

			public string[] keywords;

			public ShaderVariant(Shader shader, PassType passType, params string[] keywords)
			{
				this.shader = shader;
				this.passType = passType;
				this.keywords = keywords;
				Internal_CheckVariant(shader, passType, keywords);
			}

			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			private static extern void Internal_CheckVariant(Shader shader, PassType passType, string[] keywords);
		}

		public extern int shaderCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern int variantCount
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public extern bool isWarmedUp
		{
			[MethodImpl(MethodImplOptions.InternalCall)]
			[WrapperlessIcall]
			get;
		}

		public ShaderVariantCollection()
		{
			Internal_Create(this);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private static extern void Internal_Create([Writable] ShaderVariantCollection mono);

		public bool Add(ShaderVariant variant)
		{
			return AddInternal(variant.shader, variant.passType, variant.keywords);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern bool AddInternal(Shader shader, PassType passType, string[] keywords);

		public bool Remove(ShaderVariant variant)
		{
			return RemoveInternal(variant.shader, variant.passType, variant.keywords);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern bool RemoveInternal(Shader shader, PassType passType, string[] keywords);

		public bool Contains(ShaderVariant variant)
		{
			return ContainsInternal(variant.shader, variant.passType, variant.keywords);
		}

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		private extern bool ContainsInternal(Shader shader, PassType passType, string[] keywords);

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void Clear();

		[MethodImpl(MethodImplOptions.InternalCall)]
		[WrapperlessIcall]
		public extern void WarmUp();
	}
}
