using System;
using System.Collections.Generic;
using UnityEngine;

public class AnimImport : MonoBehaviour
{
	[Serializable]
	public class AnimImportData
	{
		public string m_name = string.Empty;

		public int m_firstFrame;

		public int m_length = 1;
	}

	public List<AnimImportData> m_animations = new List<AnimImportData>();

	public string m_packingTag = string.Empty;

	public float m_pixelsPerUnit = 1f;

	public FilterMode m_filterMode;

	public string m_sourcePSD = string.Empty;

	public string m_sourceDirectory = string.Empty;

	public bool m_deleteImportedPngs = true;

	public string m_spriteDirectory = "Sprites";

	public bool m_gui;
}
