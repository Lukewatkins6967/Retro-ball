using System;
using System.Collections;
using UnityEngine;

public class PlayerFeetUI : MonoBehaviour
{
	[SerializeField]
	private SpriteRenderer m_top;

	[SerializeField]
	private SpriteRenderer m_bottom;

	[SerializeField]
	private SpriteRenderer m_health;

	[SerializeField]
	private SpriteRenderer m_center;

	[SerializeField]
	private float m_healthMinAngle = -90f;

	[SerializeField]
	private float m_healthMaxAngle;

	[SerializeField]
	private TextMesh m_text;

	private Player m_player;

	public void SetPlayer(Player player)
	{
		m_player = player;
		m_health.color = player.GetTeam().GetColorLight();
		m_center.color = player.GetTeam().GetColorLight() + new Color(0.1f, 0.1f, 0.1f);
		m_bottom.color = player.GetTeam().GetColorLight().WithAlpha(0.3f);
		m_text.color = m_player.GetTeam().GetColorLight();
		Update();
	}

	public void ShowText(float forTime)
	{
		StopAllCoroutines();
		StartCoroutine(CoroutineShowNames(forTime));
	}

	private void Start()
	{
	}

	private void Update()
	{
		if (!(m_player == null))
		{
			float y = Mathf.LerpAngle(m_healthMinAngle, m_healthMaxAngle, m_player.GetHealth() / m_player.GetMaxHealth());
			m_health.transform.localEulerAngles = m_health.transform.localEulerAngles.WithY(y);
			m_center.enabled = m_player.HasBall();
			base.transform.position = new Vector3(m_player.transform.position.x, base.transform.position.y, m_player.transform.position.z);
		}
	}

	private IEnumerator CoroutineShowNames(float time)
	{
		string plrText = ((!m_player.GetIsAI()) ? ('P' + (Singleton<SystemGame>.Get.GetPlayerControllers().FindIndex((PlayerController item) => item == m_player.GetPlayerController()) + 1).ToString()) : "CPU");
		Array.ForEach(m_text.GetComponentsInChildren<TextMesh>(), delegate(TextMesh item)
		{
			item.text = plrText;
		});
		m_text.gameObject.SetActive(true);
		yield return this.WaitForTime(time);
		m_text.gameObject.SetActive(false);
	}
}
