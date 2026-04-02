namespace UnityEngine.Rendering
{
	public struct RenderTargetIdentifier
	{
		private BuiltinRenderTextureType m_Type;

		private int m_NameID;

		private int m_InstanceID;

		public RenderTargetIdentifier(BuiltinRenderTextureType type)
		{
			m_Type = type;
			m_NameID = -1;
			m_InstanceID = 0;
		}

		public RenderTargetIdentifier(string name)
		{
			m_Type = BuiltinRenderTextureType.None;
			m_NameID = Shader.PropertyToID(name);
			m_InstanceID = 0;
		}

		public RenderTargetIdentifier(int nameID)
		{
			m_Type = BuiltinRenderTextureType.None;
			m_NameID = nameID;
			m_InstanceID = 0;
		}

		public RenderTargetIdentifier(RenderTexture rt)
		{
			m_Type = BuiltinRenderTextureType.None;
			m_NameID = -1;
			m_InstanceID = (rt ? rt.GetInstanceID() : 0);
		}

		public static implicit operator RenderTargetIdentifier(BuiltinRenderTextureType type)
		{
			return new RenderTargetIdentifier(type);
		}

		public static implicit operator RenderTargetIdentifier(string name)
		{
			return new RenderTargetIdentifier(name);
		}

		public static implicit operator RenderTargetIdentifier(int nameID)
		{
			return new RenderTargetIdentifier(nameID);
		}

		public static implicit operator RenderTargetIdentifier(RenderTexture rt)
		{
			return new RenderTargetIdentifier(rt);
		}
	}
}
