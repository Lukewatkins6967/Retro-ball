using PowerTools;
using UnityEngine;

public class CrowdMember : MonoBehaviour
{
	[SerializeField]
	private AnimationClip[] m_animations;

	private void Start()
	{
		SpriteAnim component = GetComponent<SpriteAnim>();
		component.Play(Utils.GetRandomArrayValue(m_animations), Random.Range(0f, 1f));
	}
}
