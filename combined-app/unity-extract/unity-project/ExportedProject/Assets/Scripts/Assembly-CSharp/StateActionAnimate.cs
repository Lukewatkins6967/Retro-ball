using System;
using PowerTools;
using UnityEngine;

[Serializable]
public class StateActionAnimate
{
	public GameObject m_object;

	[HideInInspector]
	public SpriteAnim m_animatedObject;

	public AnimationClip m_animation;

	public string m_state;
}
