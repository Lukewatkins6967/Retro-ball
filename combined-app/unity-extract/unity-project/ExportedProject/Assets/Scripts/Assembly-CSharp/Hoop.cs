using UnityEngine;

public class Hoop : MonoBehaviour
{
	private Transform m_dunkTrigger;

	public Transform GetBackboard()
	{
		return base.transform.FindChild("Backboard");
	}

	public Vector3 GetHoopCenter()
	{
		return base.transform.FindChild("ScoreTrigger").position;
	}

	public Vector3 GetAiTargetPos()
	{
		if (base.transform.position.x < 0f)
		{
			return base.transform.position + new Vector3(-2f, 0f, 0f);
		}
		return base.transform.position + new Vector3(2f, 0f, 0f);
	}

	private void Awake()
	{
		m_dunkTrigger = base.transform.FindChild("DunkTrigger");
	}

	private void Update()
	{
		m_dunkTrigger.gameObject.SetActive(Singleton<SystemGame>.Get.GetBasketballs().Exists((Basketball item) => item.GetBallHeld()));
	}
}
